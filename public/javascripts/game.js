const emojis = ['😄','😃','😀','😊','☺','😉','😍','😘','😚','😗','😙','😜','😝','😛','😳','😁','😔',
    '😌','😒','😞','😣','😢','😂','😭','😪','😥','😰','😅','😓','😩','😫','😨','😱','😠','😡','😤','😖',
    '😆','😋','😷','😎','😴','😵','😲','😟','😦','😧','😈','👿','😮','😬','😐','😕','😯','😶','😇','😏','😑',
    '👲','👳','👮','👷','💂','👶','👦','👧','👨','👩','👴','👵','👱','👼','👸','😺','😸','😻','😽','😼','🙀',
    '😿','😹','😾','👹','👺','🙈','🙉','🙊','💀','👽','💩'];

const suit = ["Clubs", "Diamonds", "Spades", "Hearts"];

const rank_normal = 
    ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K"];
const unicode_normal = [
    ["🃑", "🃒", "🃓", "🃔", "🃕", "🃖", "🃗", "🃘", "🃙", "🃚", "🃛", "🃝", "🃞"], //  Clubs (trefle)
    ["🃁", "🃂", "🃃", "🃄", "🃅", "🃆", "🃇", "🃈", "🃉", "🃊", "🃋", "🃍", "🃎"], //  Diamonds (carreau)
    ["🂡", "🂢", "🂣", "🂤", "🂥", "🂦", "🂧", "🂨", "🂩", "🂪", "🂫", "🂭", "🂮"], //  Spades (pique)
    ["🂱", "🂲", "🂳", "🂴", "🂵", "🂶", "🂷", "🂸", "🂹", "🂺", "🂻", "🂽", "🂾"] //  Hearts (coeur)
]; 

const rank_cavaliers = 
    ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "C", "Q", "K"];
const unicode_cavaliers = [
    ["🃑", "🃒", "🃓", "🃔", "🃕", "🃖", "🃗", "🃘", "🃙", "🃚", "🃛", "🃜", "🃝", "🃞"], //  Clubs (trefle)
    ["🃁", "🃂", "🃃", "🃄", "🃅", "🃆", "🃇", "🃈", "🃉", "🃊", "🃋", "🃌", "🃍", "🃎"], //  Diamonds (carreau)
    ["🂡", "🂢", "🂣", "🂤", "🂥", "🂦", "🂧", "🂨", "🂩", "🂪", "🂫", "🂬", "🂭", "🂮"], //  Spades (pique)
    ["🂱", "🂲", "🂳", "🂴", "🂵", "🂶", "🂷", "🂸", "🂹", "🂺", "🂻", "🂼", "🂽", "🂾"]  //  Hearts (coeur)
];


var state;
var cardAside = -1;
var users = [];
var playerNumber = -1;
var gameData = {};
var deckOriginalLength = -1;
var remainingCards = -1;

var my_user = -1;
var my_hand = [];
var pile = [];
var socket = io();
var options = {};
var room;

function init(roomName) {

  // Move card from your hand to the pile
  $("body").on("click", ".card", function () {
    // If reorder possible do nothing
    if ($("#option_reorder").prop("checked")) {
      return;
    }

    var cardIndex = $(".card").index($(this));
    var card = my_hand[cardIndex];
    console.log("Click on your card on " + card);

    my_hand.splice(cardIndex, 1);
    $(".card:eq(" + cardIndex + ")").remove();
    card["username"] = my_user.name;
    pile.push(card);

    gameData[my_user.id].cards --
    socket.emit("updateData", { what: "update pile", pile: pile, gameData: gameData });
    drawHand();
  });

  // Move card from the pile to your hand
  $("body").on("click", ".cardinPile", function () {
    debug("click on card");

    var cardIndex = $(".cardinPile").index($(this));
    var cardIndex = options["stack_visible"] ? pile.length - 1 - cardIndex : cardIndex;
    var card = pile[cardIndex];
    console.log("Click on the pile card on " + card);

    my_hand.push(card);
    pile.splice(cardIndex, 1);

    gameData[my_user.id].cards ++
    socket.emit("updateData", { what: "update pile", pile: pile, gameData: gameData });
    drawHand();
  });

  $("#option_reorder").change(function () {
    drawHand();
  });

  $.contextMenu({
    selector: '.user_profil_menu', 
    callback: function(key, options) {
      switch(key) {
        case "turn": onTurnMenu(options); break;
      }
    },
    items: {
        "turn": {name: "Set turn", icon: "fa-hand-paper"},
    }
  });

  room = roomName
  socket.emit("connectRoom", roomName);  
}

window.onbeforeunload = function (event) {
  event.returnValue = "Refreshing the page will make you disconnect from the game!";
};

socket.on("askInfo", function () {
  /*First initialisation*/
  if (my_user == -1) {
    var randomRoger = "roger" + Math.floor(Math.random() * 100);
    var nameTemp = prompt("What's your name ?", randomRoger);
    if (nameTemp == null) {
      nameTemp = randomRoger;
    }
    my_user = {
      id: socket.id,
      date: Date.now(),
      name: nameTemp,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
    };
  }
  socket.emit("sendInfo", my_user);
});

socket.on("onUpdateHand", function (data) {
  console.log("===== Update Hand =====");
  console.log(data);
  my_hand = data;
  drawHand();
});

function isExist(value) {
  return value != undefined
}

function isMyTurn() {
  if(playerNumber != -1)  {
    return users[playerNumber].id == my_user.id;
  }
  return false;
}

socket.on("onUpdateData", function (data) {
  console.log(">>>>> New data broadcast >>>>>");
  console.log(data);
  var reDrawHand = false;
  var reDrawPile = false;
  var reDrawDeck = false;
  var reDrawUsersInfo = false;

  if ( isExist(data.options) ) {
    options = data.options;
    reDrawDeck = true;
    reDrawPile = true;
    reDrawUsersInfo = true
  }
  if ( isExist(data.hand) ) {
    my_hand = data.hand;
    reDrawHand = true;
  }
  if ( isExist(data.deckOriginalLength) ) {
    deckOriginalLength = data.deckOriginalLength;
    reDrawDeck = true;
  }
  if ( isExist(data.remainingCards) ) {
    remainingCards = data.remainingCards;
    reDrawDeck = true;
  }
  if ( isExist(data.pile) ) {
    pile = data.pile;
    reDrawPile = true;
  }
  if ( isExist(data.users) ) {
    users = data.users;
    reDrawDeck = true;
    reDrawUsersInfo = true;
  }
  if( isExist(data.playerNumber) ) {
    playerNumber = data.playerNumber;
    reDrawUsersInfo = true;
    reDrawDeck = true;
  }
  if ( isExist(data.gameData) ) {
    gameData = data.gameData;
    reDrawUsersInfo = true;
  }
  if ( isExist(data.state) ) {
    state = data.state;
    reDrawDeck = true;
  }
  if ( isExist(data.cardAside) ) {
    cardAside = data.cardAside;
    reDrawDeck = true;
  }

  if (reDrawDeck) drawDeck();
  if (reDrawHand) drawHand(data.instruction == true);
  if (reDrawPile) drawPile();
  if (reDrawUsersInfo) drawUsersInfos();
});


function onTurnMenu(options) {
  const userid = options.$trigger.attr("userid");
  socket.emit("updateData", { what: "switch turn", playerNumber: getUserPlace(userid) });
}

function start() {
  syncOption("cavaliers")
  syncOption("tricks")
  syncOption("turn")
  options["cards_distribute"] = 1;
  options["stack_visible"] = true;

  socket.emit("updateData", { what: "update options", options: options });
  resetRound();
}

function clearPlayingArea() {
  if (confirm("Are you sure, you want to clear the playing area?")) {
    socket.emit("updateData", { what: "clear playing area", pile: [] });
  }
}

function resetGame() {
  if (confirm("Are you sure, you want to reset the game?")) {
    socket.emit("resetGame");
  }
}

function getUserPlace(userID=my_user.id){
  for (var u = 0; u < users.length; u++) {
    if(users[u].id == userID) {
      return u;
    }
  }
}

function claimTrick() {
  if (confirm("Are you sure you won the trick?")) {
    if(gameData[my_user.id] == undefined) {
      gameData[my_user.id] = {}
    }
    if(gameData[my_user.id].tricks == undefined) {
      gameData[my_user.id].tricks = []
    }
    gameData[my_user.id].tricks.push(pile);
    socket.emit("updateData", { what: "claim tricks", gameData: gameData, pile: [], playerNumber: getUserPlace() });
  }
}

function shuffleDeck() {
  socket.emit("shuffleDeck");
}

function resetRound() {
  socket.emit("resetRound");
}

function takeCard() {
  var data = { hand: my_hand };
  socket.emit("takeCard", data);
}

function putCardAside() {
  socket.emit("putCardAside");
}

function endTurn() {
  if(isMyTurn()) {
    socket.emit("endTurn");
  }
}

function drawUsersInfos() {
  $("#user_container").empty();
  users.forEach((user) => {
    var number = "";
    var data = gameData[user.id];
    if(state == STATE_CONFIG) {
      number = `🂠 <b> X </b>`
    } else if(data != undefined) {
      if(options.tricks) {
        if(data != undefined && data.tricks != undefined)
          number = " 🂠 <b>" + data.tricks.length + "</b>";
      } else if (data != undefined && data.cards != undefined) {
        number = " 🂠 <b>" + data.cards + "</b>";
      }
    }
    var userClass = "user_profil"
    if(playerNumber != -1 && users[playerNumber].id == user.id) {
      userClass +=  " player"
    }
    if(state != STATE_CONFIG) {
      userClass += " user_profil_menu"
    }
    var content = `
          <div class="${userClass}" userid=${user.id}>
            <p class="user_emoji">${user.emoji}</p>
            <p>${user.name}${number}</p>
          </div>
      `;
    $("#user_container").append(content);
  });

  $(".player_number").text("Players: " + users.length);
}

function isChecked(name) {
  return options[name] == undefined ? true : options[name];
}

function isAllCards() {
  return options["cards_distribute"] == -1;
}
function drawCard(card) {
  var rank = options["cavaliers"] ? rank_cavaliers : rank_normal;
  var unicode = options["cavaliers"] ? unicode_cavaliers : unicode_normal;
  var result = unicode[suit.indexOf(card["suit"])][rank.indexOf(card["rank"])];
  console.log(result);
  return result;
}

function addOption(name, title, descriptionChecked, description) {
  return `
  <input type="checkbox" class="form-check-input" 
    id="option_${name}" onclick = 'onOptionChange("${name}")' ${isChecked(name)? "checked" : ""}/>
  <label class="form-check-label" for="option_${name}" >${title}
  => ${isChecked(name)? descriptionChecked : description}
  </label>
  `
}

function syncOption(name) {
  options[name] = $("#option_"+name).is(":checked");
}

function drawDeckConfig() {
  return `
      <div class="col-6 form-group">
        <h2 class="startText">Everyone in?</h2>
        <br /><br />
        <button class="btn btn-outline-dark btn-lg btn-block get_deck" onclick="start()">Start</button>
        <br />
        ${addOption("cavaliers", "Include cavaliers", "56 cards", "52 cards")}
        <br />
        ${addOption("tricks", "Claim tricks 🂠 <b> X </b>", "tricks won", "cards in hand")}
        <br />
        ${addOption("turn", "Turn change", "turn change each round", "turn order stay the same")}
      </div>
      <div class="col-6 container h-100">
        <div class="row h-100 justify-content-center align-items-center">
            <h2>Room ${room}</h2>
        </div>
      </div>
    `;
}

function drawDeckDistribute() {
  var content = "";
  var card_color = "";
  if (cardAside != -1 && (cardAside["suit"] == "Hearts" || cardAside["suit"] == "Diamonds")) {
    card_color = "card_red";
  }
  var message = users.length == 1
        ? "Your are the only player connected! "
        : "Card to distribute to each player (" + users.length + " players)";
  content = `
    <div class = 'col-6'><h2>Deck: ${remainingCards} / ${deckOriginalLength} cards</h2><br>
      <button onclick = 'shuffleDeck()' class = 'btn btn-outline-dark btn-lg btn-block'>Shuffle cards</button><br>
      <button class = 'btn btn-outline-dark btn-lg btn-block' onclick = 'distributeCards()'>Distribute</button><br>
      <div class="control-group form-inline">
        <label class="mb-2" for="distribute_card">${message}</label>
        <input  class= "mb-2" type = "number" id = "distribute_card" placeholder = "number of cards" 
            value="${isAllCards() ? "" : options["cards_distribute"]}" ${options["cards_distribute"] == -1 ? "disabled" : ""} />
        <div class="mx-sm-3 mb-2"> Or </div>'
        <label class="form-check-label mb-2" for="all_cards">All cards</label>
        <input  type='checkbox' class='form-check-input mb-2' 
                id='option_all_cards' ${isAllCards() ? "checked" : ""} onclick='onOptionAllCardsChange()'>
      </div>
    </div>`;
  if (cardAside != -1) {
    content += `
      <div class = 'col-6'>
        <span class="card_deck ${card_color}">${drawCard(cardAside)}</span>
      </div>
      `;
  } else {
    content += `
      <div class = 'col-6'>
        <span class="card_deck">🂠</span>
        <button style="margin-left:25%" class='col-6 distrib-btn btn btn-primary ' onclick = 'putCardAside()'>Put a card aside</button>
      </div>
    `;
  }
  return content;
}

function drawDeckPlay() {
  var content = "";
  var endTurnButton = "";

  var card_color = "";
  if (cardAside != -1 && (cardAside["suit"] == "Hearts" || cardAside["suit"] == "Diamonds")) {
    card_color = "card_red";
  }

  if(isMyTurn()) {
    endTurnButton = "<button onclick = 'endTurn()' class = 'btn btn-outline-dark btn-lg btn-block'>End turn</button><br>"
  }

  if (remainingCards == 0) {
    content = `<div class = 'col-6'><h2>Deck is empty</h2><br>
        ${endTurnButton}
        <button onclick = 'resetRound()' class = 'btn btn-outline-dark btn-lg btn-block'>Get back cards</button><br>
      </div>
      <div class = 'col-6'>
        <span class="card_deck ${card_color}">${cardAside != -1 ? drawCard(cardAside) : "∅"}</span>
      </div>
      `;
  } else {
    content = `<div class = 'col-6'><h2>Deck: ${remainingCards} / ${deckOriginalLength} cards</h2><br>
        <button onclick = 'resetRound()' class = 'btn btn-outline-dark btn-lg btn-block'>Get back cards</button><br>
        ${endTurnButton}
      </div>
      <div class = 'col-6'>
        <span class="card_deck ${card_color}">${cardAside != -1 ? drawCard(cardAside) : "🂠"}</span>
        <button style="margin-left:25%" class='col-6 distrib-btn btn btn-primary ' onclick = 'takeCard()'>Draw a card</button>
      </div>
      `;
  }
  return content;
}

function drawDeck() {
  $("#mainDeck").empty();
  var content = "";
  switch(state) {
    case STATE_CONFIG: {
      $("#reset_button").invisible();
      content = drawDeckConfig();
      break;
    }
    case STATE_DISTRIBUTE: {
      $("#reset_button").visible();
      content = drawDeckDistribute();
      break;
    }
    case STATE_PLAY: {
      $("#reset_button").visible();
      content = drawDeckPlay();
      break;
    }
  }
  $("#mainDeck").append(content);
}

function drawHand(instruction = false) {
  $("#your_hand").empty();
  var content = "";

  if (instruction) {
    content = `Read this instructions ${my_user.name}`;
    $("#instruction").show();
    $("#cards_control").invisible();
  } else {
    $("#instruction").hide();
    switch (my_hand.length) {
      case 0:
        content = `Your Hand ${my_user.name} is empty!`;
        $("#cards_control").invisible();
        break;
      case 1:
        content = `Your Hand ${my_user.name}`;
        $("#cards_control").invisible();
        break;
      default:
        content = `Your Hand ${my_user.name} : ${my_hand.length} cards`;
        $("#cards_control").visible();
    }
  }

  $("#your_hand").append(content);

  $("#cardDisplay").empty();

  $("#cardDisplay").sortable({ disabled: true });
  $("#cardDisplay").sortable({
    start: function (event, ui) {
      ui.item.data("originIndex", ui.item.index());
    },
    change: function (event, ui) {
      var originIndex = ui.item.data("originIndex");
      var currentIndex = ui.placeholder.index();
      ui.item.data("swapIndex", currentIndex);
    },
    stop: function (event, ui) {
      var originIndex = ui.item.data("originIndex");
      var swapIndex = ui.item.data("swapIndex");
      var originElement = my_hand[originIndex];

      if (originIndex < swapIndex) {
        swapIndex -= 1;
        if (swapIndex < 0) swapIndex = 0;
      }
      my_hand.splice(originIndex, 1);
      my_hand.splice(swapIndex, 0, originElement);
    },
  });

  if ($("#option_reorder").prop("checked")) {
    $("#cardDisplay").sortable("enable");
  } else {
    $("#cardDisplay").sortable("disable");
  }

  for (var i = 0; i < my_hand.length; i++) {
    card = my_hand[i];
    var $item = $('<div class="card"/>').text(drawCard(card));
    if (card["suit"] == "Hearts" || card["suit"] == "Diamonds") {
      $item.css({ color: "red" });
    } else {
      $item.css({ position: "relative" });
    }
    $("#cardDisplay").append($item);
  }
}

function drawPile() {
  if(state == STATE_CONFIG) {
    return
  }

  $("#playArea").empty();
  var content = `
      <h2>Playing Area</h2>
      <div class = "col-6 form-group">
        <input type='checkbox' class='form-check-input' id='option_stack_visible' onclick = 'onOptionChange("stack_visible")' 
        ${isChecked("stack_visible") ? "checked" : ""} />
        <label class="form-check-label" for="option_stack_visible">View all cards</label>
      </div>`;

  if (options.tricks) {
    if (pile.length == users.length) {
      content += '<button class = "playing_btn btn btn-outline-dark btn-lg btn-block" onclick = "claimTrick()">Claim trick</button>';
    }
  } else {
    content += '<button class = "playing_btn btn btn-outline-dark btn-lg btn-block" onclick = "clearPlayingArea()">Clear</button>';
  }

  $("#playArea").append(content);

  for (var i = 0; i < pile.length; i++) {
    var j = options["stack_visible"] ? pile.length - 1 - i : i;
    card = pile[j];
    var $item = $('<div class="cardinPile"/>').text(drawCard(card));
    if (card["suit"] == "Hearts" || card["suit"] == "Diamonds") {
      $item.css({ color: "red" });
    }
    var $layer = $('<div class="card_layer"/>');
    var $owner = $('<div class="card_owner"/>').text(card["username"]);
    $layer.append($item);
    $layer.append($owner);
    if (!options["stack_visible"]) {
      $layer.draggable({ containment: "parent" });
      $layer.css({ position: "absolute" });
    }
    $("#playArea").append($layer);
  }
}

function sortCard() {
  my_hand.sort(function (a, b) {
    if (suit.indexOf(a.suit) < suit.indexOf(b.suit)) return -1;
    if (suit.indexOf(a.suit) > suit.indexOf(b.suit)) return 1;

    return rank_cavaliers.indexOf(a.rank) - rank_cavaliers.indexOf(b.rank);
  });
  drawHand();
}

function distributeCards() {
  var numCards = $("#distribute_card").val();
  if ($("#option_all_cards").is(":checked")) {
    numCards = -1;
  }
  data = { numCards: numCards, hand: my_hand };
  socket.emit("distribute", data);
}

function onOptionAllCardsChange() {
  if ($("#option_all_cards").is(":checked")) {
    options["cards_distribute"] = -1;
  } else {
    options["cards_distribute"] = 1;
  }
  socket.emit("updateData", { what: "update options", options: options });
}

function onOptionChange(name) {
  options[name] = $("#option_" + name).is(":checked");
  socket.emit("updateData", { what: "update options", options: options });
}

function debug(object) {
  console.log("=== DEBUG ===");
  console.log(object);
  console.log("=============");
}

jQuery.fn.visible = function () {
  return this.css("visibility", "visible");
};

jQuery.fn.invisible = function () {
  return this.css("visibility", "hidden");
};

$(document).on("keypress", function (event) {
    var keycode = event.keyCode ? event.keyCode : event.which;
    if (keycode == "13") {
      switch(state) {
        case STATE_DISTRIBUTE: distributeCards(); break;
        case STATE_PLAY: endTurn(); break;
      }
    }
});