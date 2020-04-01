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
    io.sockets.in(room).emit("connectToRoom");
  });

  socket.on('disconnect',function(reason) {
    console.log(`${socket.id} client disconnect because ${reason}`)
  });

  socket.on("userConnected", data => {
    console.log(data)
    var room = data.room
    console.log(`[${room}] <===  User ${data.user.name} connected!`)
    var socketUsers = Object.keys(io.sockets.adapter.rooms[room].sockets);
    io.sockets.in(room).emit("addUser", { id: data.id, user: data.user, socketUsers: socketUsers});
  });

  socket.on("getDeck", data => {
    log(data.room, "get new deck")
    var deck = newDeck(data.options);
    deck = shuffleDeck(deck, deck.length);
    io.sockets.in(data.room).emit("onUpdateData", { deck: deck, options: data.options });
  });

  socket.on("clearPlayingArea", data => {
    log(data.room, "clear playing area")
    io.sockets.in(data.room).emit("onUpdateData", {pile: []});
  });

  socket.on("takeCards", data => {
    log(data.room, `${data.user} ask for ${data.numCards} cards`)

    cards = takeCards(data.numCards, data.deck, data.hand);
    io.to(data.user).emit("onUpdateHand", cards.hand);
    io.sockets.in(data.room).emit("onUpdateData", {deck: cards.deck});
  });

  socket.on("distribute", data => {
    var deck = data.deck;
    var numCards = data.numCards;
    var room = data.room
    var users = Object.keys(io.sockets.adapter.rooms[room].sockets);
    
    if (numCards == -1) {
      numCards = Math.trunc(deck.length / users.length);
    }
    log(room, `distribute ${numCards} cards`)

    for (var u = 0; u < users.length; u++) {
      hand = [];
      result = takeCards(numCards, deck, hand);
      deck = result["deck"];
      hand = result["hand"];
      
      io.to(users[u]).emit("onUpdateHand", hand);
    }
    io.sockets.in(room).emit("onUpdateData", {deck: deck});
  });

  socket.on("shuffleDeck", data => {
    log(data.room, `shuffle the deck`)

    data = {deck: shuffleDeck(data.deck, data.deck.length)}
    io.sockets.in(data.room).emit("onUpdateData", data);
  });

  socket.on("resetGame", data => {
    log(data.room, `reset the game`)

    var deck = newDeck(data.options);
    deck = shuffleDeck(deck, deck.length);
    io.sockets.in(data.room).emit("onUpdateData", {deck: deck, hand: [], pile: []});
  });

  // Broadcast function, sync datas a cross all client from a room
  socket.on("updateData", data => {
    log(data.room, "<)))")

    io.sockets.in(data.room).emit("onUpdateData", data );
  });
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

function log(room, info) {
  console.log(`[${room}] ${info}`)
}
