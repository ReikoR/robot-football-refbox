$(document).ready(function () {
    var refBox = new RefBox();

	//refBox.render();

    window.refBox = refBox;
});

function RefBox() {
	this.com = new Com(this, function (info) {
	    if (!this.game) {
            this.game = new Game(info.game.fieldId, info.game.team1.id, info.game.team2.id, this.com, info.game);
            this.render();
        } else {
	        this.game.update(info.game);
        }
    }.bind(this));

	this.game = null;
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

function Com(refBox, callback) {
    this.refBox = refBox;

    this.socket = io.connect();

    this.serialPortInfo = null;

    this.robotAcks = {};

	this.$container = null;

    this.isShowingPorts = false;
	this.$portsContainer = null;

    this.isShowingComConfig = false;
	this.$comConfigContainer = null;
    this.configModeInterval = null;
    this.configModeIntervalPeriod = 3000;

    this.socket.on('info', function (info) {
        console.log('info', info);
        callback(info);
    }.bind(this));

    this.socket.on('gameInfo', function (info) {
        console.log('gameInfo', info);
        if (this.refBox.game) {
            this.refBox.game.update(info);
        }
    }.bind(this));

    this.socket.on('serialPortChanged', function (info) {
        console.log('serialPortChanged', info);

        this.serialPortInfo = info;

        this.updateUI();
    }.bind(this));

    this.socket.on('robotAcks', function (info) {
        console.log('robotAcks', info);

        this.robotAcks = info;

        if (this.refBox.game) {
            this.refBox.game.updateRobotAcks();
        }
    }.bind(this));
}

Com.prototype.render = function ($parentContainer) {
	var $container = $('<div class="com-container"></div>'),
        $comConfig = $('<div class="button com-config-button">Configure RF module</div>'),
		$button = $('<div class="button com-button">No Connection</div>');

	$container.append(/*$comConfig, */$button);

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

	//setInterval(function () {
		//console.log('listPorts');

		this.listPorts(function () {
			if (this.isShowingPorts) {
				this.renderPorts();
			}
		}.bind(this));
	//}.bind(this), 1000);
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

	if (this.ports) {
        this.ports.forEach(function (port) {
            if (port.pnpId) {
                var isConnected = this.serialPortInfo !== null && port.comName === this.serialPortInfo.path;
                var name = (isConnected ? 'Disconnect ' : '') + port.comName;

                var $port = $('<div class="button">' + name + '</div>');

                $portsContainer.append($port);

                $port.on('click', function () {
                    if (isConnected) {
                        this.disconnect();
                    } else {
                        this.connect(port.comName);
                    }
                }.bind(this));
            }
        }.bind(this));
    }
};

Com.prototype.updateInfo = function () {
    this.socket.emit('getSerialPortInfo', function (info) {
        this.serialPortInfo = info;

        this.updateUI();
	}.bind(this));
};

Com.prototype.updateUI = function () {
    var $button = this.$container.find('.com-button');

    if (this.serialPortInfo) {
        $button.text(this.serialPortInfo.path);
    } else {
        $button.text('No Connection');
    }

    this.renderPorts();
};

Com.prototype.listPorts = function (callback) {
    this.socket.emit('listSerialPorts', function (err, ports) {
        if (!err) {
            this.ports = ports;
        }

        if (typeof callback === 'function') {
            callback();
        }
    }.bind(this));
};

Com.prototype.isOpen = function (callback) {
    this.socket.emit('isSerialPortOpen', function (err, isOpen) {
        callback(isOpen);
    });
};

Com.prototype.connect = function (path) {
    this.socket.emit('connectSerialPort', path, function () {
        this.updateInfo();
    }.bind(this));
};

Com.prototype.disconnect = function () {
    this.socket.emit('disconnectSerialPort', function (err) {
        this.updateInfo();
    }.bind(this));
};

Com.prototype.send = function (message) {
    this.socket.emit('writeSerialPort', message, function (err) {
        if (err) {
            console.log('message sending failed', message, err);
        } else {
            console.log('message sent', message);
        }
    });
};

Com.prototype.setGameState = function (state, team) {
    this.socket.emit('setGameState', state, team);
};

Com.prototype.setFieldId = function (fieldId) {
    this.socket.emit('setFieldId', fieldId);
};

Com.prototype.goal = function (team) {
    this.socket.emit('addGoal', team);
};

Com.prototype.cardYellow = function (team) {
    this.socket.emit('addCard', team);
};

function Game(fieldId, team1Id, team2Id, com, options) {
    options = options || {};

    this.fieldId = fieldId;

    this.team1 = new Team(team1Id, this, options.team1);
    this.team2 = new Team(team2Id, this, options.team2);

	this.com = com;

    this.state = options.state || 'neutral';
    this.startTime = new Date(options.startTime) || Date.now();
    this.started = options.started || false;
    this.activeTeam = options.activeTeam;

    this.fieldIds = ['A', 'B', 'C', 'D'];

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
    ];

    this.stateNames = {
        neutral: 'Neutral',
        started: 'Started',
        stopped: 'Stopped',
        'placed-ball': 'Placed ball',
        'kick-off': 'Kick-off',
        'indirect-free-kick': 'Indirect free kick',
        'direct-free-kick': 'Direct free kick',
        penalty: 'Penalty'
    };
}

Game.prototype.update = function (info) {
    info = info || {};

    this.fieldId = info.fieldId || this.fieldId;
    this.state = info.state || this.state;
    this.startTime = new Date(info.startTime) || this.startTime;
    this.started = typeof info.started === 'undefined' ? this.started : info.started;
    this.activeTeam = typeof info.activeTeam === 'undefined' ? this.activeTeam : info.activeTeam;

    this.team1.update(info.team1);
    this.team2.update(info.team2);

    this.updateUI();
};

Game.prototype.setState = function (state, team) {
    this.com.setGameState(state, team);
};

Game.prototype.setFieldId = function (fieldId) {
    this.com.setFieldId(fieldId);
};

Game.prototype.goal = function (team) {
    this.com.goal(team);
};

Game.prototype.cardYellow = function (team) {
    this.com.cardYellow(team);
};

Game.prototype.getStateText = function () {
    return (this.stateNames[this.state] || this.state) + (this.activeTeam ? (' ' + this.activeTeam) : '');
};

Game.prototype.getFieldInfoHtml = function () {
    return '<span>Field: </span><span class="field-id">' + this.fieldId + '</span>'
};

Game.prototype.updateUI = function () {
    this.$container.find('.game-state').text(this.getStateText());
    this.$container.find('.field-info').html(this.getFieldInfoHtml());

    this.updateButtons();
    this.updateCards();
    this.updateGoals();
};

Game.prototype.render = function () {
    var $container = $('<div class="container"></div>'),
        $gameContainer = $('<div class="game-container"></div>'),
        $team1Container = $('<div class="team-container"></div>'),
        $team2Container = $('<div class="team-container"></div>'),
        $info = $('<div class="info"></div>'),
        $field = $('<div class="field-info button">' + this.getFieldInfoHtml() + '</div>'),
        $state = $('<div class="game-state-container">' +
            '<span>State: </span>' +
            '<span class="game-state">' + this.getStateText() + '</span>' +
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

    $field.on('click', function () {
        var index = this.fieldIds.indexOf(this.fieldId);

        index++;

        if (index >= this.fieldIds.length) {
            index = 0;
        }

        this.setFieldId(this.fieldIds[index]);
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

    switch (this.state) {
    case 'neutral':
        this.disableAllControls();
        this.enableControls([], ['kick-off', 'penalty-kick'], ['kick-off', 'penalty-kick']);
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
        this.enableControls(['start', 'stop'], [], []);
        break;
    case 'kick-off':
        this.disableAllControls();
        this.enableControls(['start', 'stop'], [], []);
        break;
    case 'indirect-free-kick':
        this.disableAllControls();
        this.enableControls(['start', 'stop'], [], []);
        break;
    case 'direct-free-kick':
        this.disableAllControls();
        this.enableControls(['start', 'stop'], [], []);
        break;
    case 'penalty':
        this.disableAllControls();
        this.enableControls(['start', 'stop'], [], []);
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

Game.prototype.updateRobotAcks = function () {
    this.team1.updateRobotAcks();
    this.team2.updateRobotAcks();
};

Game.prototype.updateTime = function () {
    var elapsedSeconds = Math.floor((Date.now() - this.startTime) / 1000),
        elapsedTimeString = ('0' + Math.floor(elapsedSeconds / 60)).slice(-2) + ':'
            + ('0' + (elapsedSeconds % 60)).slice(-2);

    this.$container.find('.time').text(elapsedTimeString);
};

Game.prototype.start = function () {
    this.setState('started');
};

Game.prototype.stop = function () {
    this.setState('stopped');
};

Game.prototype.placedBall = function () {
    this.setState('placed-ball');
};

Game.prototype.endHalf = function () {
    this.setState('neutral');
};

function Team(id, game, options) {
    options = options || {};

    this.id = id;
    this.game = game;
    this.goalCount = options.goalCount || 0;
    this.cardCount = options.cardCount || 0;

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

Team.prototype.update = function (info) {
    info = info || {};

    this.id = info.id || this.id;
    this.goalCount = typeof info.goalCount === 'undefined' ? this.goalCount : info.goalCount;
    this.cardCount = typeof info.cardCount === 'undefined' ? this.cardCount : info.cardCount;
};

Team.prototype.render = function ($container) {
    var isTeamA = this.id === 'A',
        $controls = $('<div class="controls"></div>'),
        $info = $('<div class="info"></div>'),
        $team = $('<div class="team-id">Team: ' + this.id + '</div>'),
        $robots = $('<div class="team-robots"></div>'),
        $robot1 = $('<div class="team-robot team-robot-1">' + (isTeamA ? 'A': 'C') + '</div>'),
        $robot2 = $('<div class="team-robot team-robot-2">' + (isTeamA ? 'B': 'D') + '</div>');

    this.controlDefinitions.forEach(function (controlDefinition) {
        var control = new Button(controlDefinition.id, controlDefinition.name, controlDefinition.method.bind(this));

        this.controls[control.id] = control;

        control.render($controls);
    }.bind(this));


    $info.append($team, $robots);
    $robots.append($robot1, $robot2);
    $container.append($info, $controls);

    this.$container = $container;
};

Team.prototype.updateRobotAcks = function () {
    var isTeamA = this.id === 'A',
        robotAcks = this.game.com.robotAcks,
        robot1Id = isTeamA ? 'A' : 'C',
        robot2Id = isTeamA ? 'B' : 'D',
        $robot1 = this.$container.find('.team-robot-1'),
        $robot2 = this.$container.find('.team-robot-2');

    if (robotAcks[robot1Id]) {
        $robot1.addClass('active');
    } else {
        $robot1.removeClass('active');
    }

    if (robotAcks[robot2Id]) {
        $robot2.addClass('active');
    } else {
        $robot2.removeClass('active');
    }
};

Team.prototype.getTeamId = function () {
    return this.id;
};

Team.prototype.setState = function (state) {
    this.game.setState(state, this.getTeamId());
};

Team.prototype.kickOff = function () {
    this.setState('kick-off');
};

Team.prototype.indirectFreeKick = function () {
    this.setState('indirect-free-kick');
};

Team.prototype.directFreeKick = function () {
    this.setState('direct-free-kick');
};

Team.prototype.penalty = function () {
    this.setState('penalty');
};

Team.prototype.goal = function () {
    this.game.goal(this.getTeamId());
};

Team.prototype.cardYellow = function () {
    this.game.cardYellow(this.getTeamId());
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