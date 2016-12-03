var SerialPort = require('serialport');
var express = require('express');
var serveStatic = require('serve-static');
var app = express();
var http = require('http');
var server = http.createServer(app);
var io = require('socket.io')(server);
var logger = require('tracer').console({
    format : '{{timestamp}} <{{title}}> {{file}}:{{line}} {{message}}',
    dateformat : 'yyyy-mm-dd HH:MM:ss.l'
});
var Game = require('./game');
var crc = require('./crc');

app.use(serveStatic(__dirname + '/../web'));

var serialPort = null;
var portName = null;
var baudRate = 9600;
var serialPorts = [];
var game = null;
var robotAcksReceived = {};
var lastSerialMessage = null;
var lastMessageResendTimeout = null;
var lastMessageResendDelay = 1000;

io.on('connection', function (socket) {
    if (!game) {
        game = new Game('A', 'A', 'B');

        game.on('stateChanged', function() {
            io.emit('gameInfo', game.getInfo());
        });

        game.on('serialSend', function (message) {
            logger.log('serialSend', message);

            clearTimeout(lastMessageResendTimeout);

            robotAcksReceived.A = false;
            robotAcksReceived.B = false;
            robotAcksReceived.C = false;
            robotAcksReceived.D = false;

            sendRobotAcks();

            var buffer = Buffer.alloc(5, message);

            buffer[4] = crc(message);

            lastSerialMessage = Buffer.from(buffer);

            function send() {
                writeSerialPort(lastSerialMessage, function () {
                    logger.log('sent', lastSerialMessage);

                    if (!areAllAcksReceived()) {
                        lastMessageResendTimeout = setTimeout(send, lastMessageResendDelay);
                    }
                });
            }

            send();
        });
    }

    socket.emit('info', {
        game: game.getInfo()
    });

    socket.emit('serialPortChanged', getSerialPortInfo());

    sendRobotAcks();

    socket.on('setGameState', function (state, team) {
        logger.log('setGameState', state, team);
        game.setState(state, team);
    });

    socket.on('setFieldId', function (fieldId) {
        logger.log('setFieldId', fieldId);
        game.setFieldId(fieldId);
    });

    socket.on('addGoal', function (team) {
        logger.log('addGoal', team);
        game.addGoal(team);
    });

    socket.on('addCard', function (team) {
        logger.log('addCard', team);
        game.addCard(team);
    });

    socket.on('listSerialPorts', function (callback) {
        listSerialPorts(callback);
    });

    socket.on('isSerialPortOpen', function (callback) {
        callback(null, isSerialPortOpen());
    });

    socket.on('connectSerialPort', function (path, callback) {
        connectSerialPort(path, callback)
    });

    socket.on('disconnectSerialPort', function (callback) {
        disconnectSerialPort(callback)
    });

    socket.on('writeSerialPort', function (message, callback) {
        writeSerialPort(message, callback)
    });

    socket.on('getSerialPortInfo', function (callback) {
        callback(getSerialPortInfo());
    });
});

function sendRobotAcks() {
    io.emit('robotAcks', robotAcksReceived);
}

function areAllAcksReceived() {
    return robotAcksReceived.A && robotAcksReceived.B && robotAcksReceived.C && robotAcksReceived.D;
}

function listSerialPorts(callback) {
    SerialPort.list(function (err, ports) {
        if (err) {
            logger.log(err);
            callback(err)
        } else {
            logger.log(ports);
            serialPorts = ports;
            callback(null, ports)
        }
    });
}

function isSerialPortOpen() {
    return serialPort !== null && typeof serialPort.isOpen === 'function' && serialPort.isOpen();
}

function getSerialPortInfo() {
    if (isSerialPortOpen()) {
        return {
            path: serialPort.path
        };
    } else {
        return null;
    }
}

function connectSerialPort(path, callback) {
    logger.log('connectSerialPort', path);

    if (isSerialPortOpen()) {
        disconnectSerialPort(function (err) {
            if (err) {
                logger.log(err);
                callback(err);
            } else {
                connect();
            }
        });
    } else {
        connect();
    }

    function connect() {
        logger.log('connecting', path);

        var parser = function(length) {
            var data = new Buffer(0);
            var startByte = 'a'.charCodeAt(0);

            return function(emitter, buffer) {
                data = Buffer.concat([data, buffer]);

                var i,
                    startIndex = 0,
                    out;

                console.log(data.toString());

                for (i = 0; i < data.length; i++) {
                    if (data[i] === startByte) {
                        //If startByte inside message, set message start to that byte
                        if (i < startIndex + length - 1) {
                            startIndex = i;
                        }
                    }

                    if (startIndex + length <= data.length) {
                        if (i == startIndex + length - 1) {
                            out = data.slice(startIndex, startIndex + length);
                            startIndex = i;
                            emitter.emit('data', out);
                        }
                    } else {
                        break;
                    }
                }

                if (i == data.length) {
                    data = new Buffer(0);
                } else {
                    data = data.slice(i);
                }
            };
        };

        serialPort = new SerialPort(path, {
            baudrate: baudRate,
            parser: parser(5)
        });

        serialPort.on('open', function () {
            logger.log('serialPort open');
            io.sockets.emit('serialPortChanged', getSerialPortInfo());
            callback();
        }.bind(this));

        serialPort.on('error', function (err) {
            logger.log('serialPort error', err);
        }.bind(this));

        serialPort.on('data', function(data) {
            console.log(data);

            logger.log('serialPort data: ' + data);
            io.emit('serialPortData', data);

            var stringData = data.toString('ascii');

            logger.log('stringData', stringData);

            var crcValue = crc(stringData.slice(0, 4));

            logger.log('crcValue', crcValue);
            logger.log('received crcValue', data[4]);

            if (crcValue === data[4]) {
                logger.log('CRC OK');
            } else {
                logger.log('CRC MISMATCH');
            }

            if (stringData[0] === 'a' && stringData[3] === 'A') {
                logger.log('ACK from ' + stringData[2]);
                robotAcksReceived[stringData[2]] = true;

                if (areAllAcksReceived()) {
                    clearTimeout(lastMessageResendTimeout);
                }

                sendRobotAcks();
            }
        });
    }
}

function disconnectSerialPort(callback) {
    if (serialPort !== null && typeof serialPort.close === 'function') {
        serialPort.close(function (error) {
            if (error) {
                logger.error(error);
                callback(error);
            } else {
                callback();
            }
        });

        serialPort = null;

        io.sockets.emit('serialPortChanged', getSerialPortInfo());
    } else {
        callback();
    }
}

function writeSerialPort(message, callback) {
    logger.log('writeSerialPort', message);

    if (isSerialPortOpen()) {
        logger.log('send', message);

        serialPort.write(message, function(err, results) {
            if (err) {
                logger.error(err);
                callback(err);
            } else {
                //logger.log(results);
                callback();
            }
        });
    } else {
        callback();
    }
}

server.listen(3000);