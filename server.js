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

  socket.on(actions.CONNECT_ROOM, room => {
    console.log(`[${room}] ==> User is ${socket.id} connecting...`);
    socket.join(room);
    socket.room = room
    emitToUser(socket.id, actions.ASK_USER_INFO)
  });

  socket.on(actions.RECONNECT_ROOM, (room, user) => {
    console.log(`[${room}] ==> User is ${socket.id} reconnecting...`);
    socket.join(room);
    socket.room = room
    socket.user_name = user.name

    var gameData = getGameData();
    // Try to retrieve data
    try {
      Object.defineProperty(gameData, socket.id, Object.getOwnPropertyDescriptor(gameData, user.id));
      delete gameData[user.id];
      delete gameData[socket.id].user_disconnected
      storeData("gameData", gameData)
  
      user.id = socket.id
      var users = getUsers()
      users.set(user.id, user)
      storeData("users", users)
  
      var deck = getDeck();
      var cardsCleared = getCardsCleared();

      emitToUser(user.id, actions.UPDATE_DATA, {
        my_user: user,
        users: getUserList(),
        players: getPlayerList(),
        deckOriginalLength: getData("deckOriginalLength"),
        remainingCards: deck == undefined ? -1 : deck.length,
        cardsCleared: cardsCleared == undefined ? 0 : cardsCleared.length,
        cardAside: getData("cardAside"),
        options: getOptions(), 
        pile: getPile(), 
        gameData :getGameData(),
        state: state(),
        playerNumber : getData("playerNumber")
      });
  
      emitUpdateToRoom(actions.USER_CONNECTED, { users: getUserList(), players: getPlayerList(), gameData : getGameData()})
      console.log(`[${socket.room}] <===  User ${user.name} reconnected!`)
    } catch(exception) { // If data is not retrivable reconnect the user
      if(gameData != undefined) {
        delete gameData[user.id];
        user.id = socket.id
        sendInfo(user)
        console.log(`[${socket.room}] <===  User ${user.name} reconnected by emergency procedure!`)
      } else {
        emitToUser(socket.id, actions.USER_RECONNECTION_FAILED)
      }
    }
    
  })

  function sendInfo(user, forceRecreation=false) {
    if (getUsersConnected().length <= 1 || forceRecreation) {
      // If we are the first user to connect create the room
      logRoom("No other user connected")
      var users = new Map();
      user.status = user_status.OWNER;
      users.set(user.id, user);
      storeData("users", users);
      createNewGame();
    } else {
      logRoom("User already connected")
      // Else ask to join an existing room
      var users = getUsers();
      var isOwnerExist = false;

      var userList = getUserList();
      for (var p = 0; p < userList.length; p++) {
        var existingUser = userList[p];
        if(existingUser.status == user_status.OWNER) {
          isOwnerExist = true;
          break;
        }
      }

      if(isOwnerExist) {
        user.status = user_status.GUEST;
      } else {
        user.status = user_status.OWNER;
      }

      users.set(user.id, user);
      storeData("users", users);
    }

    var deck = getDeck();
    var cardsCleared = getOptions("cardsCleared");

    emitToUser(user.id, actions.UPDATE_DATA, {
      my_user: user,
      users: getUserList(),
      players: getPlayerList(),
      instruction: true,
      deckOriginalLength: getData("deckOriginalLength"),
      remainingCards: deck == undefined ? -1 : deck.length,
      cardsCleared: cardsCleared == undefined ? 0 : cardsCleared.length,  
      cardAside: getData("cardAside"),
      options: getOptions(),
      pile: getPile(),
      gameData: getGameData(),
      state: state(),
      hand: [],
      playerNumber: getData("playerNumber"),
    });

    emitUpdateToRoom(actions.USER_CONNECTED, { users: getUserList(), players: getPlayerList(), gameData: getGameData() });
  }

  socket.on(actions.SEND_USER_INFO, (user) => {
    console.log(`[${socket.room}] <===  User ${user.name} connected!`);
    socket.user_name = user.name;
    sendInfo(user)
  });

  function createNewGame() {
    storeData("state", states.CONFIGURATION)
    storeData("pile", [])
    storeData("hands", {})
    storeData("options", {})
    storeData("gameData", {})
    storeData("deckOriginalLength", -1)
    storeData("cardAside", -1)
    storeData("deck", [])
    storeData("playerNumber", -1)
    storeData("cardsCleared", [])
  }

  socket.on(actions.DISCONNECT,function(reason) {
    if(socketNotAvailble() ) {
      var id = socket.user_name !== undefined? socket.user_name: socket.id;
      console.log(`!! Can't retrieve room ID !! ${id} client disconnect because ${reason}`)
    } else {
      expulseUser()
    }
  });

  function expulseUser(userID=socket.id) {
    var users = getUsers();
    users.delete(userID);
    storeData("users", users);

    var gameData = getGameData();
    if(gameData && userID && gameData[userID]) {
      gameData[userID].user_disconnected = true;
    }

    emitUpdateToRoom(actions.EXPULSE_USER, { users: getUserList(), players: getPlayerList(), gameData: getGameData()});
  }

  socket.on(actions.ACCEPT_USER, userID => {
    if(socketNotAvailble()) {return}

    var users = getUsers();
    if(users == undefine) {return}
    var user = users.get(userID)
    if(user == undefine) {return}
    user.status = user_status.PLAYER;
    users.set(user.id, user);
    storeData("users", users);

    emitToUser(user.id, actions.UPDATE_DATA, {my_user: user});

    emitUpdateToRoom(actions.USER_CONNECTED, { users: getUserList(), players: getPlayerList()})
  });

  socket.on(actions.EXPULSE_USER, userID => {
    if(socketNotAvailble()) {return}

    expulseUser(userID)
    emitToUser(userID, actions.UPDATE_DATA, {
      instruction: false,
      my_user: -1,
      gameData : getGameData(),
      state: state(),
      hand: []
    });

  });

  socket.on(actions.REVEAL_PLAYERS_CARDS, () => {
    if(socketNotAvailble()) {return}

    var hands = getData("hands");
    const gameData = getGameData();
    forEach(hands, function (value, prop, obj) {
      if(gameData[prop] != undefined && gameData[prop].user_disconnected) {
        delete hands[prop]
        storeData("hands", hands);
      }
    });

    io.sockets.in(socket.room).emit(actions.REVEAL_PLAYERS_CARDS, hands);
  });

  function updateHand(userID, hand, emitToRoom=true) {
    var hands = getData("hands") ;
    hands[userID] = hand;
    storeData("hands", hands)

    var gameData = getGameData();
    if(gameData[userID] == undefined) {
      gameData[userID] = {}
    }
    gameData[userID].numberCards = hand.length;

    if(emitToRoom) {
      emitUpdateToRoom(actions.HAND_CHANGE, { gameData: storeData("gameData", gameData)});
    } else {
      storeData("gameData", gameData)
    }
  }

  socket.on(actions.HAND_CHANGE, hand => {
    if(socketNotAvailble()) {return}

    updateHand(socket.id, hand);
  });

  socket.on(actions.DRAW_CARD, data => {
    if(socketNotAvailble()) {return}
    
    var result = takeCards(1, getDeck(), data.hand);
    var deck = result.from;
    var hand = result.to;

    var gameData = getGameData()
    if(gameData == undefined) {
      gameData = {}
    }
    if(gameData[socket.id] == undefined) {
      gameData[socket.id] = {}
    }
    updateHand(socket.id, hand, false);

    storeData("deck", deck)
    emitUpdateToRoom(actions.DRAW_CARD, {
      remainingCards: deck.length, 
      gameData: getGameData()
    })
    emitToUser(socket.id, actions.UPDATE_HAND, hand)
  });

  socket.on(actions.PUT_CARD_PILE, numCards => {
    if(socketNotAvailble()) {return}

    var result = takeCards(numCards, getDeck(), getPile());
    var deck = result.from;
    var pile = result.to;

    emitUpdateToRoom(actions.PUT_CARD_PILE, {
      remainingCards: deck.length, 
      pile: storeData("pile", pile)
    })

  });

  socket.on(actions.END_TURN, () => {
    if(socketNotAvailble()) {return}
    
    var playerNumber = getData("playerNumber")
    playerNumber = (playerNumber+1) % getPlayerList().length
    emitUpdateToRoom(actions.END_TURN, { playerNumber : storeData("playerNumber", playerNumber)})
  })

  socket.on(actions.PUT_CARD_ASIDE, () => {
    if(socketNotAvailble()) {return}
    
    var result = takeCards(1, getDeck(), []);
    var deck = result.from;
    var hand = result.to;

    storeData("deck", deck)
    emitUpdateToRoom(actions.PUT_CARD_ASIDE, {
      remainingCards: deck.length, 
      cardAside: storeData("cardAside", hand[0])
    });
  });

  socket.on(actions.DISTRIBUTE, data => {
    if(socketNotAvailble()) {return}
    
    var deck = getDeck();
    var options = getOptions();
    var numCards = data.numCards;
    options.cards_distribute = numCards;
    var players = getPlayerList();
    
    
    if (numCards == -1) {
      numCards = Math.trunc(deck.length / players.length);
    }
    
    for (var p = 0; p < players.length; p++) {
      hand = [];
      result = takeCards(numCards, deck, hand);
      deck = result.from;
      hand = result.to;
      var player = players[p];
      
      emitToUser(player.id, actions.UPDATE_HAND, hand);
      updateHand(player.id, hand, false)
    }
    storeData("deck", deck)
    emitUpdateToRoom(actions.DISTRIBUTE, {
      remainingCards: deck.length, 
      options: options, 
      state: options.preparation? state(states.PREPARATION) : state(states.PLAYING), 
      gameData: getGameData()
    }, `distribute ${numCards} cards`)
  });

  socket.on(actions.CLEAR_AREA, () => {
    if(socketNotAvailble()) {return}

    var pile = getPile();
    var cardsCleared = getData("cardsCleared");
    cardsCleared = cardsCleared.concat(pile);

    storeData("cardsCleared", cardsCleared)

    emitUpdateToRoom(actions.CLEAR_AREA, {
      pile: storeData("pile", []),
      cardsCleared: cardsCleared.length
    })
  });

  socket.on(actions.GET_DISCARD_PILE, () => {
    if(socketNotAvailble()) {return}

    var pile = getPile();
    var cardsCleared = getCardsCleared();
    var numCards = pile.length + cardsCleared.length

    var deck = getDeck();
    deck = deck.concat(pile)
    storeData("pile", []);
    deck = deck.concat(cardsCleared)
    storeData("cardsCleared", []);

    deck = shuffle(deck)
    storeData("deck", deck);

    emitUpdateToRoom(actions.GET_DISCARD_PILE, {
      remainingCards: deck.length, 
      pile: [],
      cardsCleared: 0
    }, `get back ${numCards} cards from discard pile`)
  });

  socket.on(actions.SHUFFLE_DECK, () => {
    if(socketNotAvailble()) {return}
    
    var deck = getDeck()
    deck = shuffle(deck);
    storeData("deck", deck)
    emitUpdateToRoom(actions.SHUFFLE_DECK, {remainingCards: deck.length})
  });

  socket.on(actions.RESET_GAME, () => {
    if(socketNotAvailble()) {return}
    
    createNewGame()

    emitUpdateToRoom(actions.RESET_GAME, {
      instruction: false,
      deckOriginalLength: getData("deckOriginalLength"),
      remainingCards: -1,
      cardsCleared: 0,
      cardAside: getData("cardAside"),
      options: getOptions(), 
      pile: getPile(), 
      gameData : getGameData(),
      playerNumber: getData("playerNumber"),
      state: state(),
      hand: []
    });
  })

  socket.on(actions.RESET_ROUND, () => {
    if(socketNotAvailble()) {return}

    var deck = newDeck(getOptions());
    deck = shuffle(deck);
    storeData("deck", deck)
    var options = getOptions();
    var player = 0;
    storeData("hands", {})

    if(options.turn) {
      options.turn++;
      if(options.turn > getPlayerList().length+1) {
        options.turn = 2
      }
      player = options.turn-2
    }

    emitUpdateToRoom(actions.RESET_ROUND, {
      instruction: false,
      deckOriginalLength: storeData("deckOriginalLength", deck.length),
      remainingCards: deck.length,
      options: getOptions(),
      state: state(states.DISTRIBUTION),
      cardAside: storeData("cardAside", -1),
      pile: storeData("pile", []),
      cardsCleared: storeData("cardsCleared", []).length,
      options: storeData("options", options),
      hand: [],
      gameData: storeData("gameData", {}) ,
      playerNumber : storeData("playerNumber", player)
    });

  });

  // Broadcast function, sync datas a cross all client from a room
  socket.on(actions.BROADCAST_UPDATE, data => {
    if(socketNotAvailble()) {return}
    
    if (data.options != undefined) storeData("options", data.options);
    if (data.deckOriginalLength != undefined) storeData("deckOriginalLength", data.deckOriginalLength);    
    if (data.pile != undefined) storeData("pile", data.pile);
    if(data.gameData != undefined) storeData("gameData", data.gameData);
    if(data.playerNumber != undefined) storeData("playerNumber", data.playerNumber);
    
    log(data.action)
    data = {who: socket.id, ...data}
    io.sockets.in(socket.room).emit(actions.UPDATE_DATA, data)
  });

  function getUserList(){
    const users = getUsers();
    if(users != undefined ) {
      var userList  = Array.from(users.values());
      userList.sort((a,b) => a.date - b.date);
      return userList;
    }
    return [];
  }

  function getPlayerList(){
    const users = getUserList();
    var playerList  = [];
    for (var u = 0; u < users.length; u++) {
      var user = users[u];
      if(user.status != user_status.GUEST) {
        playerList.push(user);
      }
    }
    playerList.sort((a,b) => a.date - b.date);
    return playerList;
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

  function logRoom(message) {
    console.log(`[${socket.room}] ${message}`)
  }
  
  function log(what, sendLogs=true) {
    const data = `${socket.user_name} ${what}`;
    console.log(`[${socket.room}] ${data}`)
    if(sendLogs) {
      io.sockets.in(socket.room).emit(actions.LOG_ACTION, socket.user_name, what)
    }
  }
  function emitUpdateToRoom(action, data, logs=undefined) {
    if(logs !== undefined) {
      log(logs)
    } else {
      log(action)
    }
    data = {who: socket.id , action: action, ...data}
    io.sockets.in(socket.room).emit(actions.UPDATE_DATA, data)
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

  function getPile() {
    return getData("pile");
  }

  function getCardsCleared(){
    return getData("cardsCleared");
  }

  function getGameData() {
    return getData("gameData");
  }

  function getUsers() {
    return getData("users");
  }

  function getOptions() {
    return getData("options");
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
