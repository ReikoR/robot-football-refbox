//var serialport = require('serialport');
//var SerialPort = serialport.SerialPort;

$(document).ready(function () {
    var refBox = new RefBox();

	refBox.render();

    window.refBox = refBox;
});

function RefBox() {
	this.com = new Com();
	this.game = new Game('A', 'A', 'B', this.com);
}

RefBox.prototype.render = function () {
	this.game.render();
	this.renderSettings();
};

RefBox.prototype.renderSettings = function () {
	var $container = $('<div class="settings-container"></div>');

	this.com.render($container);

	$('#content').append($container);
};

function Com() {
	this.serialPort = null;
	this.portName = null;
	this.baudRate = 9600;
	this.ports = [];

	this.$container = null;

    this.isShowingPorts = false;
	this.$portsContainer = null;

    this.isShowingComConfig = false;
	this.$comConfigContainer = null;
    this.configModeInterval = null;
    this.configModeIntervalPeriod = 3000;
}

Com.prototype.render = function ($parentContainer) {
	var $container = $('<div class="com-container"></div>'),
        $comConfig = $('<div class="button com-config-button">Configure RF module</div>'),
		$button = $('<div class="button com-button">No Connection</div>');

	$container.append($comConfig, $button);

    $comConfig.on('click', function () {
        this.isShowingComConfig = !this.isShowingComConfig;

        if (this.isShowingComConfig) {
            this.showComConfig();
        } else {
            this.hideComConfig();
        }
    }.bind(this));

	$button.on('click', function () {
		this.isShowingPorts = !this.isShowingPorts;

		if (this.isShowingPorts) {
			this.showPorts();
		} else {
			this.hidePorts();
		}
	}.bind(this));

	this.$container = $container;

	$parentContainer.append($container);

	setInterval(function () {
		//console.log('listPorts');

		this.listPorts(function () {
			if (this.isShowingPorts) {
				this.renderPorts();
			}
		}.bind(this));
	}.bind(this), 1000);
};

Com.prototype.showComConfig = function () {
    console.log('showComConfig');

    if (!this.$comConfigContainer) {
        this.renderComConfig();
    }

    this.$comConfigContainer.removeClass('hidden');

    this.send('+++');

    clearInterval(this.configModeInterval);

    this.configModeInterval = setInterval(function () {
        this.send('AT\r');
    }.bind(this), this.configModeIntervalPeriod);
};

Com.prototype.hideComConfig = function () {
    console.log('hideComConfig');

    this.$comConfigContainer.addClass('hidden');

    clearInterval(this.configModeInterval);
    this.configModeInterval = null;

    this.send('ATDN\r');
};

Com.prototype.renderComConfig = function () {
    var $comConfigContainer = this.$comConfigContainer;

    if ($comConfigContainer === null) {
        $comConfigContainer = $('<div class="com-config-container"></div>');
        this.$comConfigContainer = $comConfigContainer;

        this.$container.append(this.$comConfigContainer);

        if (!this.isShowingComConfig) {
            $comConfigContainer.addClass('hidden');
        }

        var $getEncryptionKey = $('<div class="button">Get encryption key</div>'),
            $applyChanges = $('<div class="button">Apply changes</div>'),
            $loadFactoryDefaults = $('<div class="button">Load factory defaults</div>'),
            $writeChanges = $('<div class="button">Write changes</div>'),
            $encryptionKey = $('<input type="text" placeholder="Encryption key">'),
            $setEncryptionKey = $('<div class="button">Set encryption key</div>'),
            $isEncryptionEnabled = $('<div class="button">Is encryption enabled</div>'),
            $enableEncryption = $('<div class="button">Enable encryption</div>'),
            $disableEncryption = $('<div class="button">Disable encryption</div>');

        $getEncryptionKey.on('click', function () {
            this.send('ATEA\r');
        }.bind(this));

        $applyChanges.on('click', function () {
            this.send('ATAC\r');
        }.bind(this));

        $writeChanges.on('click', function () {
            this.send('ATWR\r');
        }.bind(this));

        $loadFactoryDefaults.on('click', function () {
            this.send('ATRE\r');
        }.bind(this));

        $setEncryptionKey.on('click', function () {
            this.send('ATEA' + $encryptionKey.val() + '\r');
        }.bind(this));

        $enableEncryption.on('click', function () {
            this.send('ATEE1\r');
        }.bind(this));

        $disableEncryption.on('click', function () {
            this.send('ATEE0\r');
        }.bind(this));

        $isEncryptionEnabled.on('click', function () {
            this.send('ATEE\r');
        }.bind(this));

        $comConfigContainer.append(
            $getEncryptionKey, $encryptionKey, $setEncryptionKey, $enableEncryption, $disableEncryption,
            $isEncryptionEnabled, $loadFactoryDefaults, $applyChanges, $writeChanges
        );
    }


};

Com.prototype.showPorts = function () {
	this.renderPorts();
	this.$portsContainer.removeClass('hidden');
};

Com.prototype.hidePorts = function () {
	this.$portsContainer.addClass('hidden');
};

Com.prototype.renderPorts = function () {
	var $portsContainer = this.$portsContainer;

	if ($portsContainer === null) {
		$portsContainer = $('<div class="ports-container"></div>');
		this.$portsContainer = $portsContainer;

		this.$container.append(this.$portsContainer);

		if (!this.isShowingPorts) {
			$portsContainer.addClass('hidden');
		}
	}

	$portsContainer.empty();

	this.ports.forEach(function (port) {
		if (port.pnpId) {
			var $port = $('<div class="button">' + port.comName + '</div>');

			$portsContainer.append($port);

			$port.on('click', function () {
				this.connect(port.comName);
			}.bind(this));
		}
	}.bind(this));
};

Com.prototype.updateInfo = function () {
	var $button = this.$container.find('.com-button');

	if (this.isOpen()) {
		//$button.text(this.serialPort.path);
	} else {
		$button.text('No Connection');
	}
};

Com.prototype.listPorts = function (callback) {
	/*serialport.list(function (err, ports) {
		//console.log(err, ports);

		if (!err) {
			this.ports = ports;
		}

		if (typeof callback === 'function') {
			callback();
		}
	}.bind(this));*/
};

Com.prototype.isOpen = function () {
	//return this.serialPort !== null && typeof this.serialPort.isOpen === 'function' && this.serialPort.isOpen();
	return false;
};

Com.prototype.connect = function (path) {
	if (this.isOpen()) {
		this.disconnect();
	}

	/*this.serialPort = new SerialPort(path, {
		baudrate: this.baudRate
	});

	this.serialPort.on('open', function () {
		console.log('serialPort open');
		this.updateInfo();
	}.bind(this));

	this.serialPort.on('data', function(data) {
		console.log('serialPort data: ' + data);
	});*/
};

Com.prototype.disconnect = function (message) {
	/*if (this.serialPort !== null && typeof this.serialPort.close === 'function') {
		this.serialPort.close(function (error) {
			if (error) {
				console.log(error);
			}

			this.updateInfo();
		}.bind(this));

		this.serialPort = null;
	}*/
};

Com.prototype.send = function (message) {
	if (this.isOpen()) {
        console.log('send', message);

		/*this.serialPort.write(message, function(err, results) {
			console.log('err ' + err);
			console.log('results ' + results);
		});*/
	}
};

function Game(fieldId, team1Id, team2Id, com) {
    this.fieldId = fieldId;

    this.team1 = new Team(team1Id, this);
    this.team2 = new Team(team2Id, this);

	this.com = com;

    this.state = 'neutral';
    this.startTime = Date.now();
    this.started = false;

    this.$container = null;

    this.controls = {};

    this.controlDefinitions = [
        {
            id: 'start',
            name: 'Start',
            method: this.start
        },
        {
            id: 'stop',
            name: 'Stop',
            method: this.stop
        },
        {
            id: 'placed-ball',
            name: 'Placed ball',
            method: this.placedBall
        },
        {
            id: 'end-half',
            name: 'End half',
            method: this.endHalf
        }
    ]
}

Game.prototype.setState = function (state, team) {
    this.state = state;

    var stateNames = {
        neutral: 'Neutral',
        started: 'started',
        stopped: 'Stopped',
        'placed-ball': 'Placed ball',
        'kick-off': 'Kick-off',
        'indirect-free-kick': 'Indirect free kick',
        'direct-free-kick': 'Direct free kick',
        'goal-kick': 'Goal kick',
        'throw-in': 'Throw in',
        'corner-kick': 'Corner kick',
        penalty: 'Penalty'
    };

    this.$container.find('.game-state').text((stateNames[this.state] || this.state) + (team ? (' ' + team) : ''));

    this.updateButtons();
};

Game.prototype.render = function () {
    var $container = $('<div class="container"></div>'),
        $gameContainer = $('<div class="game-container"></div>'),
        $team1Container = $('<div class="team-container"></div>'),
        $team2Container = $('<div class="team-container"></div>'),
        $info = $('<div class="info"></div>'),
        $field = $('<div><span>Field: </span><span class="field-id">' + this.fieldId + '</span></div>'),
        $state = $('<div class="game-state-container">' +
            '<span>State: </span>' +
            '<span class="game-state">' + this.state + '</span>' +
            '</div>'),
        $time = $('<div class="time"></div>'),

        $goalsContainer = $('<div class="goals-container"></div>'),
        $goalsTitle = $('<div class="goals-title">Goals</div>'),
        $goalsTeams = $('<div class="goals-teams"></div>'),
        $goalsTeam1 = $('<div class="goals-team1">' + this.team1.goalCount + '</div>'),
        $goalsTeam2 = $('<div class="goals-team2">' + this.team2.goalCount + '</div>'),

        $cardsContainer = $('<div class="cards-container"></div>'),
        $cardsTitle = $('<div class="cards-title">Yellow cards</div>'),
        $cardsTeams = $('<div class="cards-teams"></div>'),
        $cardsTeam1 = $('<div class="cards-team1">' + this.team1.cardCount + '</div>'),
        $cardsTeam2 = $('<div class="cards-team2">' + this.team2.cardCount + '</div>'),

        $controls = $('<div class="controls"></div>');

    this.controlDefinitions.forEach(function (controlDefinition) {
        var control = new Button(controlDefinition.id, controlDefinition.name, controlDefinition.method.bind(this));

        this.controls[control.id] = control;

        control.render($controls);
    }.bind(this));

    this.team1.render($team1Container);
    this.team2.render($team2Container);

    $goalsTeams.append($goalsTeam1, $goalsTeam2);
    $goalsContainer.append($goalsTitle, $goalsTeams);

    $cardsTeams.append($cardsTeam1, $cardsTeam2);
    $cardsContainer.append($cardsTitle, $cardsTeams);

    $controls.append($state, $time, $goalsContainer, $cardsContainer);

    $info.append($field);
    $gameContainer.append($info, $controls);
    $container.append($team1Container, $gameContainer, $team2Container);
    $('#content').append($container);

    this.$container = $container;

    this.updateTime();

    setInterval(this.updateTime.bind(this), 1000);

    this.updateButtons();
};

Game.prototype.enableControls = function (gameControlIds, team1ControlIds, team2ControlIds) {
    var allControls = [this.controls, this.team1.controls, this.team2.controls],
        allIds = [gameControlIds || [], team1ControlIds || [], team2ControlIds || []];

    allControls.forEach(function (controls, index) {
        var ids = allIds[index];

        ids.forEach(function (id) {
            if (controls[id]) {
                controls[id].enable();
            }
        }.bind(this));
    }.bind(this));
};

Game.prototype.disableControls = function (gameControlIds, team1ControlIds, team2ControlIds) {
    var allControls = [this.controls, this.team1.controls, this.team2.controls],
        allIds = [gameControlIds || [], team1ControlIds || [], team2ControlIds || []];

    allControls.forEach(function (controls, index) {
        var ids = allIds[index];

        ids.forEach(function (id) {
            if (controls[id]) {
                controls[id].disable();
            }
        }.bind(this));
    }.bind(this));
};

Game.prototype.enableAllControls = function () {
    var allControls = [this.controls, this.team1.controls, this.team2.controls];

    allControls.forEach(function (controls) {
        Object.keys(controls).forEach(function (id) {
            controls[id].enable();
        }.bind(this));
    }.bind(this));
};

Game.prototype.disableAllControls = function () {
    var allControls = [this.controls, this.team1.controls, this.team2.controls];

    allControls.forEach(function (controls) {
        Object.keys(controls).forEach(function (id) {
            controls[id].disable();
        }.bind(this));
    }.bind(this));
};

Game.prototype.updateButtons = function () {

    var stateNames = {
        neutral: 'Neutral',
        started: 'started',
        stopped: 'Stopped',
        'placed-ball': 'Placed ball',
        'kick-off': 'Kick-off',
        'indirect-free-kick': 'Indirect free kick',
        'direct-free-kick': 'Direct free kick',
        'goal-kick': 'Goal kick',
        'throw-in': 'Throw in',
        'corner-kick': 'Corner kick',
        penalty: 'Penalty'
    };

    switch (this.state) {
    case 'neutral':
        this.disableAllControls();
        this.enableControls([], ['kick-off'], ['kick-off']);
        break;
    case 'started':
        this.disableAllControls();
        this.enableControls(['stop']);
        break;
    case 'stopped':
        this.enableAllControls();
        break;
    case 'placed-ball':
        this.disableAllControls();
        this.enableControls(['start'], [], []);
        break;
    case 'kick-off':
        this.disableAllControls();
        this.enableControls(['start'], [], []);
        break;
    case 'indirect-free-kick':
        this.disableAllControls();
        this.enableControls(['start'], [], []);
        break;
    case 'direct-free-kick':
        this.disableAllControls();
        this.enableControls(['start'], [], []);
        break;
    case 'goal-kick':
        this.disableAllControls();
        this.enableControls(['start'], [], []);
        break;
    case 'throw-in':
        this.disableAllControls();
        this.enableControls(['start'], [], []);
        break;
    case 'corner-kick':
        this.disableAllControls();
        this.enableControls(['start'], [], []);
        break;
    case 'penalty':
        this.disableAllControls();
        this.enableControls(['start'], [], []);
        break;
    }
};

Game.prototype.updateGoals = function () {
    this.$container.find('.goals-team1').text(this.team1.goalCount);
    this.$container.find('.goals-team2').text(this.team2.goalCount);
};

Game.prototype.updateCards = function () {
    this.$container.find('.cards-team1').text(this.team1.cardCount);
    this.$container.find('.cards-team2').text(this.team2.cardCount);
};

Game.prototype.updateTime = function () {
    var elapsedSeconds = Math.floor((Date.now() - this.startTime) / 1000),
        elapsedTimeString = ('0' + Math.floor(elapsedSeconds / 60)).slice(-2) + ':'
            + ('0' + (elapsedSeconds % 60)).slice(-2);

    this.$container.find('.time').text(elapsedTimeString);
};

Game.prototype.resetTime = function () {
    this.startTime = Date.now();

    this.updateTime();
};

Game.prototype.getCommandStartAndId = function () {
    return 'a' + this.fieldId + 'X';
};

Game.prototype.sendSignal = function (signal) {
    var commandData;

    switch (signal) {
    case 'start':
        commandData = 'START';
        break;
    case 'stop':
        commandData = 'STOP';
        break;
    case 'placed-ball':
        commandData = 'PLACEDBAL';
        break;
    case 'end-half':
        commandData = 'ENDHALF';
        break;
    }

    if (commandData) {
        this.sendCommand(this.getCommandStartAndId() + commandData);
    }
};

Game.prototype.sendCommand = function (command) {
	var paddedCommand = padCommand(command, 12);

    console.log('Sending command:', paddedCommand);

	this.com.send(paddedCommand);
};

Game.prototype.start = function () {
    this.sendSignal('start');

    this.setState('started');

    if (!this.started) {
        this.started = true;
        this.resetTime();
    }
};

Game.prototype.stop = function () {
    this.sendSignal('stop');

    this.setState('stopped');
};

Game.prototype.placedBall = function () {
    this.sendSignal('placed-ball');

    this.setState('placed-ball');
};

Game.prototype.endHalf = function () {
    this.sendSignal('end-half');

    this.setState('neutral');

    this.started = false;
    this.resetTime();
};

function Team(id, game) {
    this.id = id;
    this.game = game;
    this.goalCount = 0;
    this.cardCount = 0;

    this.$container = null;

    this.controls = {};

    this.controlDefinitions = [
        {
            id: 'kick-off',
            name: 'Kick-off',
            method: this.kickOff
        },
        {
            id: 'indirect-free-kick',
            name: 'Indirect free kick',
            method: this.indirectFreeKick
        },
        {
            id: 'direct-free-kick',
            name: 'Direct free kick',
            method: this.directFreeKick
        },
        {
            id: 'goal-kick',
            name: 'Goal kick',
            method: this.goalKick
        },
        {
            id: 'throw-in',
            name: 'Throw-in',
            method: this.throwIn
        },
        {
            id: 'corner-kick',
            name: 'Corner kick',
            method: this.cornerKick
        },
        {
            id: 'penalty-kick',
            name: 'Penalty',
            method: this.penalty
        },
        {
            id: 'goal',
            name: 'Goal',
            method: this.goal
        },
        {
            id: 'card-yellow',
            name: 'Yellow card',
            method: this.cardYellow
        }
    ]
}

Team.prototype.render = function ($container) {
    var $controls = $('<div class="controls"></div>'),
        $info = $('<div class="info"></div>'),
        $team = $('<div class="team-id">Team: ' + this.id + '</div>');

    this.controlDefinitions.forEach(function (controlDefinition) {
        var control = new Button(controlDefinition.id, controlDefinition.name, controlDefinition.method.bind(this));

        this.controls[control.id] = control;

        control.render($controls);
    }.bind(this));


    $info.append($team);
    $container.append($info, $controls);

    this.$container = $container;
};

Team.prototype.getTeamId = function () {
    return this.id;
};

Team.prototype.sendSignal = function (signal) {
    var commandData;

    switch (signal) {
    case 'kick-off':
        commandData = 'KICKOFF';
        break;
    case 'indirect-free-kick':
        commandData = 'IFREEK';
        break;
    case 'direct-free-kick':
        commandData = 'DFREEK';
        break;
    case 'goal-kick':
        commandData = 'GOALK';
        break;
    case 'throw-in':
        commandData = 'THROWIN';
        break;
    case 'corner-kick':
        commandData = 'CORNERK';
        break;
    case 'penalty':
        commandData = 'PENALTY';
        break;
    case 'goal':
        commandData = 'GOAL';
        break;
    case 'card-yellow':
        commandData = 'CARDY';
        break;
    }

    if (commandData) {
        this.game.sendCommand(this.game.getCommandStartAndId() + this.getTeamId() + commandData);
    }
};

Team.prototype.setState = function (state) {
    this.game.setState(state, this.getTeamId());
};

Team.prototype.kickOff = function () {
    this.sendSignal('kick-off');

    this.setState('kick-off');
};

Team.prototype.indirectFreeKick = function () {
    this.sendSignal('indirect-free-kick');

    this.setState('indirect-free-kick');
};

Team.prototype.directFreeKick = function () {
    this.sendSignal('direct-free-kick');

    this.setState('direct-free-kick');
};

Team.prototype.goalKick = function () {
    this.sendSignal('goal-kick');

    this.setState('goal-kick');
};

Team.prototype.throwIn = function () {
    this.sendSignal('throw-in');

    this.setState('throw-in');
};

Team.prototype.cornerKick = function () {
    this.sendSignal('corner-kick');

    this.setState('corner-kick');
};

Team.prototype.penalty = function () {
    this.sendSignal('penalty');

    this.setState('penalty');
};

Team.prototype.goal = function () {
    this.sendSignal('goal');
    this.goalCount++;

    this.game.updateGoals();
};

Team.prototype.cardYellow = function () {
    this.sendSignal('card-yellow');
    this.cardCount++;

    this.game.updateCards();
};

function Button(id, name, action) {
    this.id = id;
    this.name = name;

    this.action = action;

    this.enabled = true;

    this.$button = null;
}

Button.prototype.render = function ($container) {
    var button = this,
        $button = $('<div class="button button-' + this.id + '">' + this.name + '</div>');

    $button.on('click', function () {
        if (button.enabled) {
            button.action();
        }
    });

    $container.append($button);

    this.$button = $button;

    this.update();
};

Button.prototype.update = function () {
    if (this.enabled) {
        this.$button.removeClass('disabled');
    } else {
        this.$button.addClass('disabled');
    }
};

Button.prototype.enable = function () {
    this.enabled = true;
    this.update();
};

Button.prototype.disable = function () {
    this.enabled = false;
    this.update();
};

function padCommand(data, length) {
    if (typeof length !== 'number') {
        length = 12;
    }

    return (data + new Array(length + 1).join('-')).slice(0, length);
}