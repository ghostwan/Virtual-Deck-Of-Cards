var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', (req, res) => {
   res.sendFile(__dirname + '/views/index.html');
});

app.get('/connectroom/', (req, res) => {
  res.render('client.ejs', {data: req.query['roomID']});
});

io.on('connection', (socket) => {
   socket.on('connectRoom', (room) => {
     socket.join(room);
     var users = Object.keys(io.sockets.adapter.rooms[room].sockets)
     io.sockets.in(room).emit('connectToRoom', users);
   })

   socket.on('getDeck', (data) => {
     var deck = newDeck(data['options']);
     deck = shuffleDeck(deck, deck.length);
     io.sockets.in(data['room']).emit('onUpdateDeck', {'deck' : deck, 'options' : data['options']});
   })

   socket.on('clearPlayingArea', (data) => {
    io.sockets.in(data['room']).emit('onAreaCleared');
  })

   socket.on('takeCards', (data) => {
     cards = takeCards(data[0]['numCards'], data[0]['deck'], data[0]['mycards']);
     console.log(cards);
     io.to(data[0]['user']).emit('onUpdateMyCards', cards['mycards']);
     io.sockets.in(data[0]['room']).emit('onUpdateDeck', cards['deck']);
   })


   socket.on('distribute', (data) => {
    deck = data[0]['deck']
    numCards = data[0]['numCards']
    var users = data[0]['users']

    if(numCards == -1) {
      numCards = Math.trunc(deck.length / users.length)
    }

    for(var u = 0; u < users.length; u++) {
      myCards = []
      result = takeCards(numCards, deck, myCards);
      deck = result['deck']
      myCards = result['mycards']

      io.to(users[u]).emit('onUpdateMyCards', myCards);
    }
    io.sockets.in(data[0]['room']).emit('onUpdateDeck', deck);
  })


   socket.on('shuffleDeck', (data) => {
     io.sockets.in(data['room']).emit('onUpdateDeck', shuffleDeck(data['deck'], data['deck'].length));
   })

   socket.on('resetGame', (data) => {
    var deck = newDeck(data['options']);
    deck = shuffleDeck(deck, deck.length)
    io.sockets.in(data['room']).emit('onUpdateDeck', deck);
    io.sockets.in(data['room']).emit('onAreaCleared');
    io.sockets.in(data['room']).emit('onUpdateMyCards', []);
  })

   socket.on('updatePile', (data) => {
    io.sockets.in(data['room']).emit('onUpdatePile', {'pile' : data['pile'], 'options' : data['options']});
  })
});

function newDeck(options) {
  var rank = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  if(options['cavaliers']) {
      rank = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J','C','Q', 'K'];
  }
  var suit = ['Clubs', 'Diamonds', 'Hearts', 'Spades'];
  var cards = [];
  for (var i = 0; i < suit.length; i++) {
    for (var j = 0; j < rank.length; j++) {
      var card = {"rank" : rank[j], "suit" : suit[i]};
      cards.push(card);
    }
  }
  return cards;
}

function takeCards(numcards, deck, mydeck) {
  for (var i = 0; i < numcards; i++) {
    mydeck.push(deck[0]);
    deck.splice(0, 1);
  }
  data = {"mycards" : mydeck, "deck" : deck};
  return data;
}

function shuffleDeck(deck, num) {
  var shuffledDeck = [];
  for (var i = num - 1; i > -1; i--) {
    var index = Math.floor(Math.random() * i);
    shuffledDeck.push(deck[index]);
    deck.splice(index, 1);
  }
  return shuffledDeck
}

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
   console.log(`Virtual desk of cards listenning on ${ PORT }`);
});
