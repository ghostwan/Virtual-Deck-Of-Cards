const STATE_CONFIG = "config"
const STATE_PLAY = "play"
const STATE_DISTRIBUTE = "distribute"

const RANK = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const RANK_CAVLIERS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "C", "Q", "K", "A"];

const SUITS = ["clubs", "diams", "spades", "hearts"];

const EMOJIS = ['😄','😃','😀','😊','☺','😉','😍','😘','😚','😗','😙','😜','😝','😛','😳','😁','😔',
    '😌','😒','😞','😣','😢','😂','😭','😪','😥','😰','😅','😓','😩','😫','😨','😱','😠','😡','😤','😖',
    '😆','😋','😷','😎','😴','😵','😲','😟','😦','😧','😈','👿','😮','😬','😐','😕','😯','😶','😇','😏','😑',
    '👲','👳','👮','👷','💂','👶','👦','👧','👨','👩','👴','👵','👱','👼','👸','😺','😸','😻','😽','😼','🙀',
    '😿','😹','😾','👹','👺','🙈','🙉','🙊','💀','👽','💩'];

const actions = {
    CONNECTING: "I am connecting...",
    CONNECT_USER: "user connected",
    CONNECTED: "I am connected",
    CONNECTION_FAIL: "my connection failed",
    DISCONNECT_USER: "user disconnected",
    GOT_CARD: "I got a card",
    SHUFFLE: "shuffle the deck",
    DRAW_CARD: "draw a card",
    END_TURN: "end turn",
    CARD_ASIDE: "put a card aside",
    DISTRIBUTE: "distribute",
    RESET_GAME: "reset the game",
    RESET_ROUND: "reset the round",
    PLAY_CARD: "play a card",
    PLAY_ALL_CARDS: "play all cards",
    UPDATE_OPTION: "update option",
    CHANGE_TURN: "change turn",
    TAKE_BACK_CARD: "take back a card",
    TAKE_BACK_ALL_CARDS: "take back all cards",
    CLEAR_AREA: "clear the playing area",
    CLAIM_TRICK: "claim trick"
}

const menus = {
    SET_TURN: "your turn",
    CLEAR: "clear",
    SHUFFLE: "shuffle",
    TAKE_CARD: "take",
    TAKE_ALL_CARDS: "take all cards",
    PLAY_ALL_CARDS: "play all cards"
}

const configs = {
    escalier : { 
        tricks: true,
        cards_distribute: 2,
        cavaliers: true,
        turn: true,
        all_cards: false,
        block_get_cards: true,
        next_turn: true,
        stack_visible: true,
    },
    ratatouille : { 
        tricks: true,
        cards_distribute: -1,
        cavaliers: true,
        turn: false,
        all_cards: true,
        block_get_cards: false,
        next_turn: true,
        stack_visible: true
    }, 
    yaniv : { 
        tricks: false,
        cards_distribute: 4,
        cavaliers: true,
        turn: false,
        all_cards: false,
        block_get_cards: false,
        next_turn: false,
        stack_visible: true
    }
}