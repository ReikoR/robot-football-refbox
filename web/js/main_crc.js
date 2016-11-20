var polynomial = parseInt('0xD8', 16);
var width = 8;
var topBit = 128;

var crcTable = [];

function crcInit() {
    var remainder;
    var dividend;
    var bit;

    /*
     * Compute the remainder of each possible dividend.
     */
    for (dividend = 0; dividend < 256; ++dividend) {
        /*
         * Start with the dividend followed by zeros.
         */
        remainder = Math.floor(dividend << (width - 8) % 256);

        /*
         * Perform modulo-2 division, a bit at a time.
         */
        for (bit = 8; bit > 0; --bit) {
            /*
             * Try to divide the current data bit.
             */
            if (remainder & topBit) {
                remainder = Math.floor(((remainder << 1) ^ polynomial) % 256);
            } else {
                remainder = (remainder << 1);
            }
        }

        /*
         * Store the result into the table.
         */
        crcTable[dividend] = remainder;
    }
}

function crc(message) {
    var data;
    var remainder = 0;
    var byte;

    /*
     * Divide the message by the polynomial, a byte at a time.
     */
    for (byte = 0; byte < message.length; ++byte) {
        data = Math.floor((message.charCodeAt(byte) ^ (remainder >> (width - 8))) % 256);
        remainder = Math.floor((crcTable[data] ^ (remainder << 8)) % 256);
    }

    /*
     * The final remainder is the CRC.
     */
    return remainder;
}

crcInit();

$(document).ready(function () {
    var $input = $('#message');
    var $dec = $('#output-decimal');
    var $hex = $('#output-hex');

    $input.on('keyup', function () {
        var value = $input.val();
        var dec = [];
        var hex = [];
        var decimal;
        var i;

        console.log(value);

        var crcByte = crc(value);

        console.log(crcByte);

        for (i = 0; i < value.length; i++) {
            decimal = value.charCodeAt(i);
            dec.push(decimal);
            hex.push(decimal.toString(16));
        }

        dec.push(crcByte);
        hex.push(crcByte.toString(16));

        $dec.text(dec.join(' '));
        $hex.text(hex.join(' '));
    });
});