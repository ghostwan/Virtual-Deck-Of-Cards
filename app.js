var app = require('express')();
var http = require('http').Server(app);
var io = require('socket.io')(http);

app.get('/', function(req, res) {
   res.sendFile(__dirname + '/views/index.html');
});

app.get('/connectroom/', function(req, res){
  res.render('cards.ejs', {data: req.query['roomID']});
});

io.on('connection', function(socket) {
   socket.on('connectRoom', function(room){
     socket.join(room);
     var users = Object.keys(io.sockets.adapter.rooms[room].sockets)
     io.sockets.in(room).emit('connectToRoom', users);
   })

   socket.on('getDeck', function(data){
     var deck = newDeck();
     io.sockets.in(data['room']).emit('giveDeck', shuffleDeck(deck, deck.length));
   })

   socket.on('clearPlayingArea', function(data){
    io.sockets.in(data['room']).emit('areaCleared');
  })

   socket.on('takeCards', function(data){
     cards = takeCards(data[0]['numCards'], data[0]['deck'], data[0]['mycards']);
     console.log(cards);
     io.to(data[0]['user']).emit('getCards', cards['mycards']);
     io.sockets.in(data[0]['room']).emit('giveDeck', cards['deck']);
   })


   socket.on('distribute', function(data){
    deck = data[0]['deck']
    numCards = data[0]['numCards']
    users = data[0]['users']

    if(numCards == -1) {
      numCards = Math.trunc(deck.length / users.length)
    }

    for(var u = 0; u < users.length; u++) {
      myCards = []
      result = takeCards(numCards, deck, myCards);
      deck = result['deck']
      myCards = result['mycards']

      io.to(users[u]).emit('getCards', myCards);
    }
    io.sockets.in(data[0]['room']).emit('giveDeck', deck);
  })


   socket.on('shuffleDeck', function(data){
     io.sockets.in(data['room']).emit('giveDeck', shuffleDeck(data['deck'], data['deck'].length));
   })

   socket.on('reclaimCards', function(data){
    var deck = newDeck();
    io.sockets.in(data['room']).emit('giveDeck', shuffleDeck(deck, deck.length));
    io.sockets.in(data['room']).emit('areaCleared');
    io.sockets.in(data['room']).emit('getCards', []);
  })

   socket.on('addPile', function(data){
     data['pile'].push([]);
     console.log(data);
     io.sockets.in(data['room']).emit('addedPile', data['pile']);
   })

   socket.on('moveCard', function(data){
     console.log(data);
     data['pile'][0].push(data['card']);
     console.log(data['card']);
     io.sockets.in(data['room']).emit('movedCard', {"pile" : data['pile'], "card" : data['card']});
   })
});

function newDeck() {
  var rank = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  var suit = ['Clubs', 'Diamonds', 'Hearts', 'Spades'];
  var cards = [];
  for (var i = 0; i < 4; i++) {
    for (var j = 0; j < 13; j++) {
      var card = {"rank" : rank[j], "suit" : suit[i], "reveal" : '0'};
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
http.listen(PORT, function() {
   console.log(`Virtual desk of cards listenning on ${ PORT }`);
});
