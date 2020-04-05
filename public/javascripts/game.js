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
var tricks = {};
var user = -1;
var deckOriginalLength = -1;
var remainingCards = -1;

var pile = [];
var my_hand = [];
var socket = io();
var options = {};

socket.emit("connectRoom", "<%= data %>");

window.onbeforeunload = function (event) {
  event.returnValue = "Refreshing the page will make you disconnect from the game!";
};

socket.on("askInfo", function () {
  /*First initialisation*/
  if (user == -1) {
    var randomRoger = "roger" + Math.floor(Math.random() * 100);
    var nameTemp = prompt("What's your name ?", randomRoger);
    if (nameTemp == null) {
      nameTemp = randomRoger;
    }
    user = {
      id: socket.id,
      date: Date.now(),
      name: nameTemp,
      emoji: emojis[Math.floor(Math.random() * emojis.length)],
    };
  }
  socket.emit("sendInfo", user);
});

socket.on("onUpdateHand", function (data) {
  console.log("===== Update Hand =====");
  console.log(data);
  my_hand = data;
  drawHand();
});

socket.on("onUpdateData", function (data) {
  console.log(">>>>> New data broadcast >>>>>");
  console.log(data);
  var reDrawHand = false;
  var reDrawPile = false;
  var reDrawDeck = false;
  var reDrawUsersInfo = false;

  if (data.options != undefined) {
    options = data.options;
    reDrawDeck = true;
    reDrawPile = true;
  }
  if (data.hand != undefined) {
    my_hand = data.hand;
    reDrawHand = true;
  }
  if (data.deckOriginalLength != undefined) {
    deckOriginalLength = data.deckOriginalLength;
    reDrawDeck = true;
  }
  if (data.remainingCards != undefined) {
    remainingCards = data.remainingCards;
    reDrawDeck = true;
  }
  if (data.pile != undefined) {
    pile = data.pile;
    reDrawPile = true;
  }
  if (data.users != undefined) {
    users = data.users;
    reDrawDeck = true;
    reDrawUsersInfo = true;
  }
  if (data.tricks != undefined) {
    tricks = data.tricks;
    reDrawUsersInfo = true;
  }
  if (data.state != undefined) {
    state = data.state;
    reDrawDeck = true;
  }
  if (data.cardAside != undefined) {
    cardAside = data.cardAside;
    reDrawDeck = true;
  }

  if (reDrawDeck) drawDeck();
  if (reDrawHand) drawHand(data.instruction == true);
  if (reDrawPile) drawPile();
  if (reDrawUsersInfo) drawUsersInfos();
});

function start() {
  options["cavaliers"] = $("#option_cavaliers").is(":checked");
  options["tricks"] = $("#option_tricks").is(":checked");
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

function claimTrick() {
  if (confirm("Are you sure you won the trick?")) {
    tricks[user.id];
    if (tricks[user.id] == undefined) {
      tricks[user.id] = [];
    }
    tricks[user.id].push(pile);
    socket.emit("updateData", { what: "claim tricks", tricks: tricks, pile: [] });
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

function drawUsersInfos() {
  $("#user_container").empty();
  users.forEach((user) => {
    var tricksNumber = "";
    var userTricks = tricks[user.id];
    if (userTricks != undefined) {
      tricksNumber = " 🂠 <b>" + userTricks.length + "</b>";
    }
    var content = `
          <div class="user_profil">
            <p class="user_emoji">${user.emoji}</p>
            <p>${user.name}${tricksNumber}</p>
          </div>
      `;
    $("#user_container").append(content);
  });

  $(".player_number").text("Players: " + users.length);
}

function isChecked(name) {
  var result = options[name] == undefined ? true : options[name];
  return result ? "checked" : "";
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

function drawDeck() {
  $("#mainDeck").empty();
  var content = "";
  var card_color = "";
  if (cardAside != -1 && (cardAside["suit"] == "Hearts" || cardAside["suit"] == "Diamonds")) {
    card_color = "card_red";
  }

  if (state == "config") {
    $("#reset_button").invisible();
    content = `
        <div class="col-6 form-group">
          <h2 class="startText">Everyone in?</h2>
          <br /><br />
          <button class="btn btn-outline-dark btn-lg btn-block get_deck" onclick="start()">Start</button>
          <br />
          <input type="checkbox" class="form-check-input" 
                 id="option_cavaliers" onclick = 'onOptionChange("cavaliers")' ${isChecked("cavaliers")}/>
          <label class="form-check-label" for="option_cavaliers" >Include cavaliers (56 cards) </label>
          <br />
          <input type="checkbox" class="form-check-input" 
                 id="option_tricks" onclick = 'onOptionChange("tricks")' ${isChecked("tricks")}/>
          <label class="form-check-label" for="option_tricks">Claim tricks (as for tarot)</label>
        </div>
        <div class="col-6 container h-100">
          <div class="row h-100 justify-content-center align-items-center">
              <h2>Room <%= data %></h2>
          </div>
        </div>
      `;
  } else if (state == "distribute") {
    $("#reset_button").visible();
    var message =
      users.length == 1
        ? "Your are the only player connected! "
        : "Card to distribute to each player (" + users.length + " players)";
    content = `
      <div class = 'col-6'><h2>Deck: ${remainingCards} / ${deckOriginalLength} cards</h2><br>
        <button onclick = 'shuffleDeck()' class = 'btn btn-outline-dark btn-lg btn-block'>Shuffle cards</button><br>
        <button class = 'btn btn-outline-dark btn-lg btn-block' onclick = 'distributeCards()'>Distribute</button><br>
        <div class="control-group form-inline">
          <label class="mb-2" for="distribute_card">${message}</label>
          <input  class= "mb-2" type = "number" id = "distribute_card" placeholder = "number of cards" 
              value="${isAllCards() ? "" : options["cards_distribute"]}" ${
      options["cards_distribute"] == -1 ? "disabled" : ""
    } />
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
  } else if (state == "play") {
    $("#reset_button").visible();

    if (remainingCards == 0) {
      content = `<div class = 'col-6'><h2>Deck is empty</h2><br>
          <button onclick = 'resetRound()' class = 'btn btn-outline-dark btn-lg btn-block'>Get back cards</button><br>
        </div>
        <div class = 'col-6'>
          <span class="card_deck ${card_color}">${cardAside != -1 ? drawCard(cardAside) : "∅"}</span>
        </div>
        `;
    } else {
      content = `<div class = 'col-6'><h2>Deck: ${remainingCards} / ${deckOriginalLength} cards</h2><br>
          <button onclick = 'resetRound()' class = 'btn btn-outline-dark btn-lg btn-block'>Get back cards</button><br>
        </div>
        <div class = 'col-6'>
          <span class="card_deck ${card_color}">${cardAside != -1 ? drawCard(cardAside) : "🂠"}</span>
          <button style="margin-left:25%" class='col-6 distrib-btn btn btn-primary ' onclick = 'takeCard()'>Draw a card</button>
        </div>
        `;
    }
  }
  $("#mainDeck").append(content);
}

function drawHand(instruction = false) {
  $("#your_hand").empty();
  var content = "";

  if (instruction) {
    content = `Read this instructions ${user.name}`;
    $("#instruction").show();
    $("#cards_control").invisible();
  } else {
    $("#instruction").hide();
    switch (my_hand.length) {
      case 0:
        content = `Your Hand ${user.name} is empty!`;
        $("#cards_control").invisible();
        break;
      case 1:
        content = `Your Hand ${user.name}`;
        $("#cards_control").invisible();
        break;
      default:
        content = `Your Hand ${user.name} : ${my_hand.length} cards`;
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
  $("#playArea").empty();
  var content = `
      <h2>Playing Area</h2>
      <div class = "col-6 form-group">
        <input type='checkbox' class='form-check-input' id='option_stack_visible' onclick = 'onOptionChange("stack_visible")' ${isChecked(
          "stack_visible"
        )} />
        <label class="form-check-label" for="option_stack_visible">View all cards</label>
      </div>`;

  if (options.tricks) {
    if (pile.length == users.length) {
      content +=
        '<button id="are_button" class = "btn btn-outline-dark btn-lg btn-block" onclick = "claimTrick()">Claim trick</button>';
    }
  } else {
    content +=
      '<button id="are_button" class = "btn btn-outline-dark btn-lg btn-block" onclick = "clearPlayingArea()">Clear</button>';
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

// Move card from you deck to the pile
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
  card["username"] = user.name;
  pile.push(card);

  socket.emit("updateData", { what: "update pile", pile: pile });
  drawHand();
});

// Move card from the pile to your deck
$("body").on("click", ".cardinPile", function () {
  var cardIndex = $(".cardinPile").index($(this));
  var cardIndex = options["stack_visible"] ? pile.length - 1 - cardIndex : cardIndex;
  var card = pile[cardIndex];
  console.log("Click on the pile card on " + card);

  my_hand.push(card);
  pile.splice(cardIndex, 1);

  socket.emit("updateData", { what: "update pile", pile: pile });
  drawHand();
});

$(document).on("keypress", function (event) {
  var keycode = event.keyCode ? event.keyCode : event.which;
  if (keycode == "13") {
    distributeCards();
  }
});

$("#option_reorder").change(function () {
  drawHand();
});

jQuery.fn.visible = function () {
  return this.css("visibility", "visible");
};

jQuery.fn.invisible = function () {
  return this.css("visibility", "hidden");
};
