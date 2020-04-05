var app = require("express")();
var http = require("http").Server(app);
var io = require("socket.io")(http, {'pingTimeout': 20000, 'pingInterval': 3000});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log(`VDOC server listenning on ${PORT}`);
});


app.get("/", (req, res) => {
  console.log('Requesting index.html');
  res.sendFile(__dirname + "/views/index.html");
});

app.get("/connectroom/", (req, res) => {
  res.render("client.ejs", { data: req.query["roomID"] });
});

io.on("connection", socket => {
  socket.on("connectRoom", room => {
    console.log(`[${room}] ==> User is ${socket.id} connecting...`);
    socket.join(room);
    socket.room = room
    emitToUser(socket.id, "askInfo")
  });

  socket.on("sendInfo", (user) => {
    console.log(user)
    console.log(`[${socket.room}] <===  User ${user.name} connected!`)

    if(getUsersConnected().length <= 1) {
      // If we are the first user to connect create the room
      var users = new Map()
      users.set(user.id, user)
      storeData("users", users)
      createNewGame()
    } else {
      // Else ask to join an existing room
      var users = getData("users")
      users.set(user.id, user)
      storeData("users", users)
    }
    
    var deck = getDeck()
    emitToUser(user.id, "onUpdateData", {
      users: prepareUsers(),
      instruction: true,
      deckOriginalLength: getData("deckOriginalLength"),
      remainingCards: deck == undefined ? -1 : deck.length,
      cardAside: getData("cardAside"),
      options: getData("options"), 
      pile: getData("pile"), 
      tricks : getData("tricks"),
      state: state(),
      hand: []
    });

    emitUpdateToRoom({users: prepareUsers()})
  });

  function createNewGame() {
    storeData("state", "config")
    storeData("pile", [])
    storeData("options", {})
    storeData("tricks", {})
    storeData("deckOriginalLength", -1)
    storeData("cardAside", -1)
    storeData("deck", [])
  }

  socket.on('disconnect',function(reason) {
    if(socketNotAvailble() ) {
      console.log(`!! Can't retrieve room ID !! ${socket.id} client disconnect because ${reason}`)
    } else {
      log(`${socket.id} client disconnect because ${reason}`)
      var users = getData("users")
      users.delete(socket.id)
      storeData("users", users)
      emitUpdateToRoom({users: prepareUsers()})
    }
  });

  socket.on("takeCard", data => {
    if(socketNotAvailble()) {return}

    log(`${socket.id} draw a card`)
    cards = takeCards(1, getDeck(), data.hand);
    updateDeck(cards.deck)
    emitToUser(socket.id, "onUpdateHand", cards.hand)
  });

  socket.on("putCardAside", data => {
    if(socketNotAvailble()) {return}

    log(`put a card aside`)
    cards = takeCards(1, getDeck(), []);
    var cardAside = cards.hand[0]
    storeData("deck", cards.deck)
    storeData("cardAside", cardAside)
    emitUpdateToRoom({remainingCards: cards.deck.length, cardAside: cardAside})
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
    log(`distribute ${numCards} cards`)

    for (var u = 0; u < users.length; u++) {
      hand = [];
      result = takeCards(numCards, deck, hand);
      deck = result["deck"];
      hand = result["hand"];
      
      emitToUser(users[u], "onUpdateHand", hand);
    }
    storeData("deck", deck)
    emitUpdateToRoom({remainingCards: deck.length, options: options, state: state("play")})
  });

  socket.on("shuffleDeck", () => {
    if(socketNotAvailble()) {return}

    log(`shuffle the deck`)
    var deck = getDeck()
    updateDeck(shuffleDeck(deck, deck.length));
  });

  socket.on("resetGame", () => {
    if(socketNotAvailble()) {return}
    log(`reset the game`)

    createNewGame()

    emitUpdateToRoom({
      instruction: false,
      deckOriginalLength: getData("deckOriginalLength"),
      remainingCards: -1,
      cardAside: getData("cardAside"),
      options: getData("options"), 
      pile: getData("pile"), 
      tricks : getData("tricks"),
      state: state(),
      hand: []
    });
  })

  socket.on("resetRound", () => {
    if(socketNotAvailble()) {return}

    log(`reset the round`)
    var deck = newDeck(getData("options"));
    deck = shuffleDeck(deck, deck.length);

    storeData("tricks", {})
    storeData("pile", [])
    storeData("deck", deck)
    storeData("deckOriginalLength", deck.length);
    storeData("cardAside", -1);

    emitUpdateToRoom({
      instruction: false,
      deckOriginalLength: deck.length,
      remainingCards: deck.length,
      options: getData("options"),
      state: state("distribute"),
      cardAside: -1,
      pile: [],
      hand: [],
      tricks:{} 
    });

  });

  // Broadcast function, sync datas a cross all client from a room
  socket.on("updateData", data => {
    if(socketNotAvailble()) {return}

    log("<))) "+(data.what != undefined? data.what : ""))

    if (data.options != undefined) storeData("options", data.options);
    if (data.deckOriginalLength != undefined) storeData("deckOriginalLength", data.deckOriginalLength);    
    if (data.pile != undefined) storeData("pile", data.pile);
    if(data.tricks != undefined) storeData("tricks", data.tricks);

    emitUpdateToRoom(data );
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
        log("socket not available !")
        return true;
      } else {
        return false;
      }
  }

  function log(info) {
    console.log(`[${socket.room}] ${info}`)
  }
  function emitUpdateToRoom(data) {
    io.sockets.in(socket.room).emit("onUpdateData", data)
  }
  function emitToUser(user, event, data) {
    io.to(user).emit(event, data);
  }

  function storeData(key, data){
    io.sockets.adapter.rooms[socket.room][key] = data
  }

  function getData(key) {
    return io.sockets.adapter.rooms[socket.room][key]
  }

  function updateDeck(deck) {
    storeData("deck", deck)
    emitUpdateToRoom({remainingCards: deck.length})
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
  var rank = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
  if (options["cavaliers"]) {
    rank = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "C", "Q", "K"];
  }
  var suit = ["Clubs", "Diamonds", "Spades", "Hearts"];
  var cards = [];
  for (var i = 0; i < suit.length; i++) {
    for (var j = 0; j < rank.length; j++) {
      var card = { rank: rank[j], suit: suit[i] };
      cards.push(card);
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

function shuffleDeck(deck, num) {
  var shuffledDeck = [];
  for (var i = num - 1; i > -1; i--) {
    var index = Math.floor(Math.random() * i);
    shuffledDeck.push(deck[index]);
    deck.splice(index, 1);
  }
  return shuffledDeck;
}

