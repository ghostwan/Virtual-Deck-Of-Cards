var express = require('express');
var path = require('path');
var http = require("http");
var fs = require("fs")
var vm = require('vm')
vm.runInThisContext(fs.readFileSync(__dirname + "/public/javascripts/common.js"))
vm.runInThisContext(fs.readFileSync(__dirname + "/public/javascripts/tools.js"))

var app = express();
var server = http.Server(app)
var io = require("socket.io")(server, {'pingTimeout': 20000, 'pingInterval': 3000});


app.use(express.static(path.join(__dirname, 'public')));
app.set('views', path.join(__dirname, 'views'));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`VDOC server listenning on ${PORT}`);
});

app.get("/", (req, res) => {
  console.log('Requesting index.html');
  res.sendFile(__dirname + "/views/index.html");
  // res.render('index');
});

app.get("/connectroom/", (req, res) => {
  res.sendFile(__dirname + "/views/game.html", { data: req.query["roomID"] });
});

io.on("connection", socket => {
  socket.on("connectRoom", room => {
    console.log(`[${room}] ==> User is ${socket.id} connecting...`);
    socket.join(room);
    socket.room = room
    emitToUser(socket.id, "askInfo")
  });

  socket.on("reconnectToRoom", (room, user) => {
    console.log(`[${room}] ==> User is ${socket.id} reconnecting...`);
    socket.join(room);
    socket.room = room
    socket.user_name = user.name

    var gameData = getData("gameData");
    // Try to retrieve data
    try {
      Object.defineProperty(gameData, socket.id, Object.getOwnPropertyDescriptor(gameData, user.id));
      delete gameData[user.id];
      delete gameData[socket.id].user_disconnected
      storeData("gameData", gameData)
  
      user.id = socket.id
      var users = getData("users")
      users.set(user.id, user)
      storeData("users", users)
  
      var deck = getDeck()
      emitToUser(user.id, "onUpdateData", {
        action: actions.CONNECTED,
        my_user: user,
        users: prepareUsers(),
        deckOriginalLength: getData("deckOriginalLength"),
        remainingCards: deck == undefined ? -1 : deck.length,
        cardAside: getData("cardAside"),
        options: getData("options"), 
        pile: getData("pile"), 
        gameData : getGameData(),
        state: state(),
        playerNumber : getData("playerNumber")
      });
  
      emitUpdateToRoom(actions.CONNECT_USER, { users: prepareUsers(), gameData : getGameData()})
      console.log(`[${socket.room}] <===  User ${user.name} reconnected!`)
    } catch(exception) { // If data is not retrivable reconnect the user
      if(gameData != undefined) {
        delete gameData[user.id];
        user.id = socket.id
        sendInfo(user)
        console.log(`[${socket.room}] <===  User ${user.name} reconnected by emergency procedure!`)
      } else {
        emitToUser(socket.id, "onReconnectionFailed")
      }
    }
    
  })

  function sendInfo(user, forceRecreation=false) {
    if (getUsersConnected().length <= 1 || forceRecreation) {
      // If we are the first user to connect create the room
      var users = new Map();
      users.set(user.id, user);
      storeData("users", users);
      createNewGame();
    } else {
      // Else ask to join an existing room
      var users = getData("users");
      users.set(user.id, user);
      storeData("users", users);
    }

    var deck = getDeck();
    emitToUser(user.id, "onUpdateData", {
      action: actions.CONNECTED, 
      my_user: user,
      users: prepareUsers(),
      instruction: true,
      deckOriginalLength: getData("deckOriginalLength"),
      remainingCards: deck == undefined ? -1 : deck.length,
      cardAside: getData("cardAside"),
      options: getData("options"),
      pile: getData("pile"),
      gameData: obfuscate(getData("gameData")),
      state: state(),
      hand: [],
      playerNumber: getData("playerNumber"),
    });

    emitUpdateToRoom(actions.CONNECT_USER, { users: prepareUsers(), gameData: getGameData() });
  }

  socket.on("sendInfo", (user) => {
    console.log(user);
    console.log(`[${socket.room}] <===  User ${user.name} connected!`);
    socket.user_name = user.name;
    sendInfo(user)
  });

  function createNewGame() {
    storeData("state", states.CONFIGURE)
    storeData("pile", [])
    storeData("options", {})
    storeData("gameData", {})
    storeData("deckOriginalLength", -1)
    storeData("cardAside", -1)
    storeData("deck", [])
    storeData("playerNumber", -1)
  }

  socket.on('disconnect',function(reason) {
    if(socketNotAvailble() ) {
      var id = socket.user_name !== undefined? socket.user_name: socket.id;
      console.log(`!! Can't retrieve room ID !! ${id} client disconnect because ${reason}`)
    } else {
      var users = getData("users")
      users.delete(socket.id)
      storeData("users", users)

      var gameData = getData("gameData") 
      if(gameData && socket.id && gameData[socket.id]) {
        gameData[socket.id].user_disconnected = true
      }

      emitUpdateToRoom(actions.DISCONNECT_USER, { users: prepareUsers(), gameData: getGameData()});
    }
  });

  socket.on("revealCards", () => {
    io.sockets.in(socket.room).emit("onRevealCards", getGameData(false));
  });

  socket.on("takeCardInHand", data => {
    if(socketNotAvailble()) {return}
    
    var result = takeCards(1, getDeck(), data.hand);
    var deck = result.from;
    var hand = result.to;

    var gameData = getData("gameData") 
    if(gameData == undefined) {
      gameData = {}
    }
    if(gameData[socket.id] == undefined) {
      gameData[socket.id] = {}
      gameData[socket.id].cards = []
    }
    gameData[socket.id].cards = hand;
    storeData("gameData", gameData);

    storeData("deck", deck)
    emitUpdateToRoom(actions.DRAW_CARD, {
      remainingCards: deck.length, 
      gameData: getGameData()
    })
    var cardsInHand = unobfuscateCards(hand)
    emitToUser(socket.id, "onUpdateHand", cardsInHand)
  });

  socket.on("addCardToPile", numCards => {
    if(socketNotAvailble()) {return}

    var result = takeCards(numCards, getDeck(), getData("pile"));
    var deck = result.from;
    var pile = result.to;

    emitUpdateToRoom(actions.PUT_CARD_PILE, {
      remainingCards: deck.length, 
      pile: storeData("pile", pile)
    })

  });

  socket.on("endTurn", () => {
    if(socketNotAvailble()) {return}
    
    var playerNumber = getData("playerNumber")
    playerNumber = (playerNumber+1) % getUsersConnected().length
    emitUpdateToRoom(actions.END_TURN, { playerNumber : storeData("playerNumber", playerNumber)})
  })

  socket.on("putCardAside", () => {
    if(socketNotAvailble()) {return}
    
    var result = takeCards(1, getDeck(), []);
    var deck = result.from;
    var hand = result.to;

    storeData("deck", deck)
    emitUpdateToRoom(actions.CARD_ASIDE, {
      remainingCards: deck.length, 
      cardAside: storeData("cardAside", hand[0])
    });
  });

  socket.on("distribute", data => {
    if(socketNotAvailble()) {return}
    
    var deck = getDeck();
    var options = getData("options")
    var numCards = data.numCards;
    options.cards_distribute = numCards;
    var users = getUsersConnected();
    
    if (numCards == -1) {
      numCards = Math.trunc(deck.length / users.length);
    }
    
    var gameData = getData("gameData")

    for (var u = 0; u < users.length; u++) {
      hand = [];
      result = takeCards(numCards, deck, hand);
      deck = result.from;
      hand = result.to;
      
      emitToUser(users[u], "onUpdateHand", hand);
      
      if(gameData[users[u]] == undefined) {
        gameData[users[u]] = {}
      }
      gameData[users[u]].cards = hand
    }
    storeData("gameData", gameData)
    storeData("deck", deck)
    emitUpdateToRoom(actions.DISTRIBUTE, {
      remainingCards: deck.length, 
      options: options, 
      state: options.preparation? state(states.PREPARATION) : state(states.PLAY), 
      gameData: getGameData()
    }, `distribute ${numCards} cards`)
  });

  socket.on("getDiscardPile", () => {
    var pile = getData("pile");
    var deck = getDeck();
    var numCards  = pile.length;

    for (c = 0; c < numCards; c++) {
      var card = pile[c];
      deck.push(card);
    }
    pile = [];

    storeData("pile", []);
    deck = shuffle(deck)
    storeData("deck", deck);

    emitUpdateToRoom(actions.GET_DISCARD_PILE, {
      remainingCards: deck.length, 
      pile: [],
    }, `get back ${numCards} cards from discard pile`)
  });

  socket.on("shuffleDeck", () => {
    if(socketNotAvailble()) {return}
    
    var deck = getDeck()
    deck = shuffle(deck);
    storeData("deck", deck)
    emitUpdateToRoom(actions.SHUFFLE_DECK, {remainingCards: deck.length})
  });

  socket.on("resetGame", () => {
    if(socketNotAvailble()) {return}
    
    createNewGame()

    emitUpdateToRoom(actions.RESET_GAME, {
      instruction: false,
      deckOriginalLength: getData("deckOriginalLength"),
      remainingCards: -1,
      cardAside: getData("cardAside"),
      options: getData("options"), 
      pile: getData("pile"), 
      gameData : getData("gameData"),
      playerNumber: getData("playerNumber"),
      state: state(),
      hand: []
    });
  })

  socket.on("resetRound", () => {
    if(socketNotAvailble()) {return}

    var deck = newDeck(getData("options"));
    deck = shuffle(deck);
    storeData("deck", deck)
    var options = getData("options");
    var player = 0;

    if(options.turn) {
      options.turn++;
      if(options.turn > getUsersConnected().length+1) {
        options.turn = 2
      }
      player = options.turn-2
    }

    emitUpdateToRoom(actions.RESET_ROUND, {
      instruction: false,
      deckOriginalLength: storeData("deckOriginalLength", deck.length),
      remainingCards: deck.length,
      options: getData("options"),
      state: state(states.DISTRIBUTE),
      cardAside: storeData("cardAside", -1),
      pile: storeData("pile", []),
      options: storeData("options", options),
      hand: [],
      gameData: storeData("gameData", {}) ,
      playerNumber : storeData("playerNumber", player)
    });

  });

  // Broadcast function, sync datas a cross all client from a room
  socket.on("updateData", data => {
    if(socketNotAvailble()) {return}
    
    if (data.options != undefined) storeData("options", data.options);
    if (data.deckOriginalLength != undefined) storeData("deckOriginalLength", data.deckOriginalLength);    
    if (data.pile != undefined) storeData("pile", data.pile);
    if(data.gameData != undefined) {
      data.gameData = obfuscate(data.gameData);
      storeData("gameData", data.gameData);
    }
    if(data.playerNumber != undefined) storeData("playerNumber", data.playerNumber);
    
    log(data.action)
    data = {who: socket.id, ...data}
    io.sockets.in(socket.room).emit("onUpdateData", data)
  });

  function prepareUsers(){
    var usersArray  = Array.from(getData("users").values());
    usersArray.sort((a,b) => a.date - b.date);
    return usersArray;
  }

  function socketNotAvailble() {
    if(socket == undefined 
      || socket.room == undefined
      || io.sockets.adapter.rooms[socket.room] == undefined) {
        log("socket not available !", false)
        return true;
      } else {
        return false;
      }
  }

  function log(what, sendLogs=true) {
    const data = `${socket.user_name} ${what}`;
    console.log(`[${socket.room}] ${data}`)
    if(sendLogs) {
      io.sockets.in(socket.room).emit("onNewAction", socket.user_name, what)
    }
  }
  function emitUpdateToRoom(action, data, logs=undefined) {
    if(logs !== undefined) {
      log(logs)
    } else {
      log(action)
    }
    data = {who: socket.id , action: action, ...data}
    io.sockets.in(socket.room).emit("onUpdateData", data)
  }
  function emitToUser(user, event, data) {
    io.to(user).emit(event, data);
  }

  function storeData(key, data){
    io.sockets.adapter.rooms[socket.room][key] = data
    return data
  }

  function getData(key) {
    return io.sockets.adapter.rooms[socket.room][key]
  }

  function getDeck() {
    return getData("deck")
  }

  function getGameData(obfuscated=true) {
    if(obfuscated) {
      return obfuscate(getData("gameData"));
    } else {
      return unobfuscateData(getData("gameData"))
    }
  }

  function getUsersConnected() {
    return Object.keys(io.sockets.adapter.rooms[socket.room].sockets)
  }

  /* MAGICAL GETTER / SETTER */
  function state(value=undefined) {
    if(value != undefined) {
      storeData(state.name, value)
      return value;
    } else {
      return getData(state.name)
    }
  }
});


function newDeck(options) {
  var cards = [];
  var numberOfdecks = options.number_decks
  for (var d = 0; d < numberOfdecks; d++) {
    for (var s = 0; s < SUITS.length; s++) {
      for (var r = 0; r < RANK.length; r++) {
        if(!options.cavaliers && RANK[r] == "C")  {
          continue;
        }
        var card = { rank: RANK[r], suit: SUITS[s] };
        cards.push(card);
      }
    }

    if(options.atouts) {
      for (var a = 0; a < ATOUTS.length; a++) {
        var card = { rank: ATOUTS[a], suit: "atouts" };
        cards.push(card);
      }
    }
  }
  return cards;
}

function takeCards(numcards, from, to) {
  // To avoid taking more cards than existing
  if(numcards > from.length) {
    numcards = from.length;
  }
  for (var i = 0; i < numcards; i++) {
    to.push(from[0]);
    from.splice(0, 1);
  }
  data = { to: to, from: from };
  return data;
}

function debug(object) {
  console.log("<<<<<< DEBUG >>>>>>>>")
  console.log(JSON.stringify(object, null, 2))
  console.log(">>>>>> DEBUG <<<<<<<<")
}

function obfuscate(gameData) {
  if(gameData) {
    forEach(gameData, function (value, prop, obj) {
      if(value.cards) {
        var tempCards = value.cards
        for (c = 0; c < tempCards.length; c ++) {
          // If data not obfuscate yet, obfuscate
          var card = tempCards[c];
          if(card != undefined && SUITS_ATOUTS.includes(card.suit)) {
            card.rank = card.rank.normalise_to_ascii().crypt_symmetric();
            card.suit = card.suit.normalise_to_ascii().crypt_symmetric();
          }
        }
      }
    });
  }
  return gameData;
}

function unobfuscateData(gameData) {
  if(gameData) {
    forEach(gameData, function (value, prop, obj) {
      unobfuscateCards(value.cards);
    });
  }
  return gameData;
}

function unobfuscateCards(array) {
  if(array) {
    for (c = 0; c < array.length; c ++) {
      // If data obfuscate unobfuscate
      var card = array[c];
      if(!SUITS_ATOUTS.includes(card.suit )) {
        card.rank = card.rank.normalise_to_ascii().crypt_symmetric();
        card.suit = card.suit.normalise_to_ascii().crypt_symmetric();
      }
    }
  }
  return array;
}

String.prototype.normalise_to_ascii   = function(){return unescape(encodeURIComponent(this)); }
String.prototype.normalise_to_unicode = function(){return decodeURIComponent(escape(this)); }

String.prototype.crypt_symmetric = function(key){
  var me = this + "";                                             //unlink reference

  key = Number(String(Number(key))) === key ? Number(key) : 13;   //optionaly provide key for symmetric-like-""encryption"".

  me = me.split('')                                               //to array of characters.
         .map(function(c){return c.charCodeAt(0);})               //to array of numbers (each is character's ASCII value)
         .map(function(i){return i ^ key;        })               //XOR ""ENCRYPTION""
         ;
  me = String.fromCharCode.apply(undefined, me);                  //one-liner trick: array-of-numbers to array-of-characters (ASCII value), join to single string. may result in buffer-overflow on long string!
  return me;
};

