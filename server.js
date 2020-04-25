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
        gameData : storeData("gameData", gameData),
        state: state(),
        playerNumber : getData("playerNumber")
      });
  
      emitUpdateToRoom(actions.CONNECT_USER, { users: prepareUsers()})
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
      gameData: getData("gameData"),
      state: state(),
      hand: [],
      playerNumber: getData("playerNumber"),
    });

    emitUpdateToRoom(actions.CONNECT_USER, { users: prepareUsers() });
  }

  socket.on("sendInfo", (user) => {
    console.log(user);
    console.log(`[${socket.room}] <===  User ${user.name} connected!`);
    socket.user_name = user.name;
    sendInfo(user)
  });

  function createNewGame() {
    storeData("state", STATE_CONFIG)
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
      emitUpdateToRoom(actions.DISCONNECT_USER, { users: prepareUsers()})
    }
  });

  socket.on("takeCard", data => {
    if(socketNotAvailble()) {return}
    
    cards = takeCards(1, getDeck(), data.hand);
    var gameData = getData("gameData") 
    if(gameData == undefined) {
      gameData = {}
    }
    if(gameData[socket.id] == undefined) {
      gameData[socket.id] = {}
      gameData[socket.id].cards = 0
    }
    gameData[socket.id].cards ++;
    
    storeData("deck", cards.deck)
    emitUpdateToRoom(actions.DRAW_CARD, {
      remainingCards: cards.deck.length, 
      gameData: storeData("gameData", gameData)
    })
    emitToUser(socket.id, "onUpdateHand", cards.hand)
  });

  socket.on("endTurn", () => {
    if(socketNotAvailble()) {return}
    
    var playerNumber = getData("playerNumber")
    playerNumber = (playerNumber+1) % getUsersConnected().length
    emitUpdateToRoom(actions.END_TURN, { playerNumber : storeData("playerNumber", playerNumber)})
  })

  socket.on("putCardAside", () => {
    if(socketNotAvailble()) {return}
    
    cards = takeCards(1, getDeck(), []);
    storeData("deck", cards.deck)
    emitUpdateToRoom(actions.CARD_ASIDE, {
      remainingCards: cards.deck.length, 
      cardAside: storeData("cardAside", cards.hand[0])
    })
  });

  socket.on("distribute", data => {
    if(socketNotAvailble()) {return}
    
    var deck = getDeck();
    var options = getData("options")
    var numCards = data.numCards;
    options["cards_distribute"] = numCards;
    var users = getUsersConnected();
    
    if (numCards == -1) {
      numCards = Math.trunc(deck.length / users.length);
    }
    
    var gameData = getData("gameData")

    for (var u = 0; u < users.length; u++) {
      hand = [];
      result = takeCards(numCards, deck, hand);
      deck = result["deck"];
      hand = result["hand"];
      
      emitToUser(users[u], "onUpdateHand", hand);
      
      if(gameData[users[u]] == undefined) {
        gameData[users[u]] = {}
      }
      gameData[users[u]].cards = hand.length
    }
    storeData("gameData", gameData)
    storeData("deck", deck)
    emitUpdateToRoom(actions.DISTRIBUTE, {
      remainingCards: deck.length, 
      options: options, 
      state: state(STATE_PLAY), 
      gameData: gameData
    }, `distribute ${numCards} cards`)
  });

  socket.on("shuffleDeck", () => {
    if(socketNotAvailble()) {return}
    
    var deck = getDeck()
    deck = shuffle(deck);
    storeData("deck", deck)
    emitUpdateToRoom(actions.SHUFFLE, {remainingCards: deck.length})
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
      state: state(STATE_DISTRIBUTE),
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
    if(data.gameData != undefined) storeData("gameData", data.gameData);
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
  var rank = RANK;
  if (options["cavaliers"]) {
    rank = RANK_CAVLIERS;
  }
  var cards = [];
  var decks = options.number_decks
  for (var d = 0; d < decks; d++) {
    for (var i = 0; i < SUITS.length; i++) {
      for (var j = 0; j < rank.length; j++) {
        var card = { rank: rank[j], suit: SUITS[i] };
        cards.push(card);
      }
    }
  }
  return cards;
}

function takeCards(numcards, deck, hand) {
  for (var i = 0; i < numcards; i++) {
    hand.push(deck[0]);
    deck.splice(0, 1);
  }
  data = { hand: hand, deck: deck };
  return data;
}


