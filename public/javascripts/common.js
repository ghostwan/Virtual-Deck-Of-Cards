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
    UPDATE_OPTION: "update option",
    CHANGE_TURN: "change turn",
    TAKE_BACK_CARD: "take back a card",
    CLEAR_AREA: "clear the playing area",
    CLAIM_TRICK: "claim trick"
}