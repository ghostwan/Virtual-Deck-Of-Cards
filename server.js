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
    io.sockets.in(room).emit("connectToRoom");
  });

  socket.on('disconnect',function(reason) {
    if(socket.room != undefined ) {
      log(`${socket.id} client disconnect because ${reason}`)
      emitToRoom("removeUser", socket.id)
    } else {
      console.log(`!! Can't retrieve room ID !! ${socket.id} client disconnect because ${reason}`)
    }
  });

  socket.on("userConnected", user => {
    console.log(user)
    console.log(`[${socket.room}] <===  User ${user.name} connected!`)
    emitToRoom("onUpdateData", {user : user})
  });

  socket.on("takeCards", data => {
    log(`${data.user} ask for ${data.numCards} cards`)
    cards = takeCards(data.numCards, getDeck(), data.hand);
    updateDeck(cards.deck)
    emitToUser(data.user, "onUpdateHand", cards.hand)
  });

  socket.on("distribute", data => {
    var deck = getDeck();
    var numCards = data.numCards;
    var users = Object.keys(io.sockets.adapter.rooms[socket.room].sockets);
    
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
    updateDeck(deck);
  });

  socket.on("shuffleDeck", () => {
    log(`shuffle the deck`)
    var deck = getDeck()
    updateDeck(shuffleDeck(deck, deck.length));
  });

  socket.on("resetGame", options => {
    log(`reset the game`)
    var deck = newDeck(options);
    deck = shuffleDeck(deck, deck.length)

    io.sockets.adapter.rooms[socket.room].deck = deck

    emitToRoom("onUpdateData", {
      remainingCards: deck.length,
      deckOriginalLength: deck.length,
      hand: [], 
      pile: [], 
      options: options, 
      tricks:{} });
  });

  // Broadcast function, sync datas a cross all client from a room
  socket.on("updateData", data => {
    log("<))) "+(data.what != undefined? data.what : ""))

    emitToRoom("onUpdateData", data );
  });

  function log(info) {
    console.log(`[${socket.room}] ${info}`)
  }
  function emitToRoom(event, data) {
    io.sockets.in(socket.room).emit(event, data)
  }
  function emitToUser(user, event, data) {
    io.to(user).emit(event, data);
  }

  function updateDeck(deck) {
    if(deck != undefined) {
      io.sockets.adapter.rooms[socket.room].deck = deck
      emitToRoom("onUpdateData", {remainingCards: deck.length})
    }
  }

  function getDeck() {
    return io.sockets.adapter.rooms[socket.room].deck
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

