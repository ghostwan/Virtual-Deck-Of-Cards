const RANK = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q", "K", "A"];
const RANK_CAVLIERS = ["2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "C", "Q", "K", "A"];

const SUITS = ["clubs", "diams", "spades", "hearts"];

const EMOJIS = ['😄','😃','😀','😊','☺','😉','😍','😘','😚','😗','😙','😜','😝','😛','😳','😁','😔',
    '😌','😒','😞','😣','😢','😂','😭','😪','😥','😰','😅','😓','😩','😫','😨','😱','😠','😡','😤','😖',
    '😆','😋','😷','😎','😴','😵','😲','😟','😦','😧','😈','👿','😮','😬','😐','😕','😯','😶','😇','😏','😑',
    '👲','👳','👮','👷','💂','👶','👦','👧','👨','👩','👴','👵','👱','👼','👸','😺','😸','😻','😽','😼','🙀',
    '😿','😹','😾','👹','👺','🙈','🙉','🙊','💀','👽','💩'];

const states = {
    CONFIGURE : "config",
    EXCHANGE: "exchange",
    PLAY: "play",
    DISTRIBUTE: "distribute"
}

const actions = {
    CONNECTING: "I am connecting...",
    CONNECT_USER: "user connected",
    CONNECTED: "I am connected",
    CONNECTION_FAIL: "my connection failed",
    DISCONNECT_USER: "user disconnected",
    GOT_CARD: "I got a card",
    SHUFFLE_DECK: "shuffle the deck",
    SHUFFLE_HAND: "shuffle hand",
    DRAW_CARD: "draw a card",
    END_TURN: "end turn",
    CARD_ASIDE: "put a card aside",
    DISTRIBUTE: "distribute",
    RESET_GAME: "reset the game",
    RESET_ROUND: "reset the round",
    READY_TO_PLAY: "ready to play",
    PLAY_CARD: "play a card",
    PLAY_ALL_CARDS: "play all cards",
    UPDATE_OPTION: "update option",
    CHANGE_TURN: "change turn",
    TAKE_BACK_CARD: "take back a card",
    TAKE_BACK_ALL_CARDS: "take back all cards",
    TAKE_CARD_ASIDE: "take card aside",
    RANDOM_FIRST_PLAYER: "choose first player randomly",
    REMOVE_CARD_ASIDE: "remove card aside",
    CLEAR_AREA: "clear the playing area",
    CLAIM_TRICK: "claim trick",
    REVEAL_PLAYERS_CARDS: "reveal players cards"
}

const configs = {
    escalier : { 
        tricks: true,
        cards_distribute: 2,
        cavaliers: true,
        turn: true,
        all_cards: false,
        block_get_cards: true,
        block_action: true,
        end_turn_draw: true,
        stack_visible: true,
    },
    ratatouille : { 
        tricks: true,
        cards_distribute: -1,
        cavaliers: true,
        turn: false,
        all_cards: true,
        block_get_cards: true,
        block_action: true,
        end_turn_draw: true,
        stack_visible: true,
        exchange: true
    }, 
    yaniv : { 
        tricks: false,
        cards_distribute: 4,
        cavaliers: true,
        turn: false,
        all_cards: false,
        block_get_cards: false,
        block_action: true,
        end_turn_draw: false,
        stack_visible: true
    }
}