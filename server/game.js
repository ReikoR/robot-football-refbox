const EventEmitter = require('events');
const util = require('util');
var logger = require('tracer').console({
    format : '{{timestamp}} <{{title}}> {{file}}:{{line}} {{message}}',
    dateformat : 'yyyy-mm-dd HH:MM:ss.l'
});

function Game(fieldId, team1Id, team2Id) {
    this.fieldId = fieldId;

    this.team1 = new Team(team1Id, this);
    this.team2 = new Team(team2Id, this);

    this.state = 'neutral';
    this.startTime = Date.now();
    this.started = false;
    this.activeTeam = null;

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

    this.stateSignals = {
        neutral: 'end-half',
        started: 'start',
        stopped: 'stop',
        'placed-ball': 'placed-ball',
        'kick-off': 'kick-off',
        'indirect-free-kick': 'indirect-free-kick',
        'direct-free-kick': 'direct-free-kick',
        penalty: 'penalty'
    }
}

util.inherits(Game, EventEmitter);

Game.prototype.getInfo = function () {
    return {
        fieldId: this.fieldId,
        state: this.state,
        startTime: this.startTime,
        started: this.started,
        activeTeam: this.activeTeam,
        team1: this.team1.getInfo(),
        team2: this.team2.getInfo()
    }
};

Game.prototype.setState = function (state, team) {
    if (this.stateNames[state]) {
        this.state = state;
        this.activeTeam = team;

        if (state === 'started' && !this.started) {
            this.started = true;
            this.resetTime();
        } else if (state === 'neutral') {
            this.started = false;
            this.resetTime();
        }

        if (this.stateSignals[state]) {
            this.sendSignal(this.stateSignals[state]);
        }

        this.emit('stateChanged');
    }
};

Game.prototype.setFieldId = function (fieldId) {
    this.fieldId = fieldId;

    this.emit('stateChanged');
};

Game.prototype.addGoal = function (team) {
    var teamInstance = null;

    if (this.team1.id === team) {
        teamInstance = this.team1;
    } else {
        teamInstance = this.team2;
    }

    if (teamInstance) {
        this.activeTeam = team;
        teamInstance.goalCount++;
        this.sendSignal('goal');
        this.emit('stateChanged');
    }
};

Game.prototype.addCard = function (team) {
    var teamInstance = null;

    if (this.team1.id === team) {
        teamInstance = this.team1;
    } else {
        teamInstance = this.team2;
    }

    if (teamInstance) {
        this.activeTeam = team;
        teamInstance.cardCount++;
        this.sendSignal('card-yellow');
        this.emit('stateChanged');
    }
};

Game.prototype.resetTime = function () {
    this.startTime = Date.now();
};
Game.prototype.getCommandStartAndId = function () {
    return 'a' + this.fieldId + 'X';
};

Game.prototype.sendSignal = function (signal) {
    var commandData;

    var isTeamBActive = this.activeTeam === 'B';

    switch (signal) {
        case 'start':
            commandData = 'S';
            break;
        case 'stop':
            commandData = 'H';
            break;
        case 'placed-ball':
            commandData = 'B';
            break;
        case 'end-half':
            commandData = 'E';
            break;
        case 'kick-off':
            commandData = isTeamBActive ? 'k' : 'K';
            break;
        case 'indirect-free-kick':
            commandData = isTeamBActive ? 'i' : 'I';
            break;
        case 'direct-free-kick':
            commandData = isTeamBActive ? 'd' : 'D';
            break;
        case 'penalty':
            commandData = isTeamBActive ? 'p' : 'P';
            break;
        case 'goal':
            commandData = isTeamBActive ? 'g' : 'G';
            break;
        case 'card-yellow':
            commandData = isTeamBActive ? 'y' : 'Y';
            break;
    }

    if (commandData) {
        this.emit('serialSend', this.getCommandStartAndId() + commandData);
    }
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
}

Team.prototype.getInfo = function () {
    return {
        id: this.id,
        goalCount: this.goalCount,
        cardCount: this.cardCount
    };
};

Team.prototype.getTeamId = function () {
    return this.id;
};

module.exports = Game;