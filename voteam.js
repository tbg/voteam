Clock = new Meteor.Collection("clock");
Players = new Meteor.Collection("players");
if (Meteor.isClient) {
  clockSubscription = Meteor.subscribe('clock');
  playerSubscription = Meteor.subscribe('players', Session.get('selected_player'));
  var clock = 9999;
  Deps.autorun(function () {
    clock = clockSubscription.ready() ? Clock.findOne().clock : 9999;
    if (clock == 0) {
      Session.set('gameIsWon', false);
      Session.set('selected_player', undefined);
    }
  });
  var voteCount = function() {
    if(playerSubscription.ready()) {
      return Players.find({}, {votes: true}).fetch()
        .map(function (e) { return e.votes; })
        .reduce(function (a, b) { return a+b; }, 0);
    }
    return 0;
  };
  var players_transformed = function () {
    var totalVotes = voteCount() || 1;
    var voteDiscrepancy = 0;
    var maxIndex = 0;
    var ret = Players.find({}, {
      transform: function (p) {
        var exact = totalVotes/100 * p.goal;
        // smart rounding so that we're at most one off at the end 
        p.goalVotes = voteDiscrepancy > 0 ? Math.ceil(exact) : Math.floor(exact);
        voteDiscrepancy += exact - p.goalVotes;
        return p;
      }
    }).fetch();
    if(ret.length > 0) {
      var wantedVoteSum = 0;
      ret.forEach(function (k, i) {
        wantedVoteSum += k.goalVotes;
        maxIndex = (k.goalVotes > ret[maxIndex].goalVotes) ? i : maxIndex;
      });
      // the discrepancy is at most one, and the maximum index is at least one,
      // so we won't create a negative desired vote count here.
      ret[maxIndex].goalVotes += totalVotes - wantedVoteSum;
      ret.map(function (p) {
        p.goal = 100 * p.goalVotes / totalVotes;
        return p;
      });
    }
    return ret;
  };
  Deps.autorun(function () {
    var gameIsWon = true;
    players_transformed().forEach(function(p) {
      gameIsWon = gameIsWon && (p.goalVotes == p.votes);
    });
    Session.set('gameIsWon', gameIsWon);
  });
  Template.voting.clock = function() {
    return clockSubscription.ready() ? Clock.findOne().clock : 0;
  };
  Template.voting.won = function() {
    return Session.get('gameIsWon') || false;
  };
  Template.voting.players = function() {
    return playerSubscription.ready() ? Players.find({}, {sort: {name: -1}}) : [];
  };
  Template.voting.selected_name = function () {
    var player = Players.findOne(Session.get('selected_player'));
    return player && player.name;
  };
  Template.voting.voteCount = voteCount;
  Template.voting.players_transformed = players_transformed;
  Template.player.selected = function () {
    return Session.equals('selected_player', this._id) ? "selected" : "";
  };
  Template.player.votePercent = function () {
    return this.votes * 100 / voteCount();
  };
  Template.player.goalMet = function () {
    return (this.votes === this.goalVotes) ? "goal-met" : "";
  };
  Template.player.events = ({
    'click': function () {
      if(Session.get('selected_player')) {
        Players.update(Session.get('selected_player'), { $inc: { votes: -1 }});
      } else {
      } 
      Session.set('selected_player', this._id);
      Players.update(Session.get('selected_player'), { $inc: { votes: 1 }});
    }
  });
}

if (Meteor.isServer) {
  Meteor.startup(function () {
    var names, goals;
    Clock.remove({});
    Clock.insert({clock: initialClock});
    var newGame = function () {
      var cuts;
      var lastCut = 0;
      goals = [];
      names = ["Option 1", "Option 2", "Option 3"];
      names.map(function () { return Math.random(); }).sort().forEach(function (c) {
        goals.push(c - lastCut);
        lastCut = c;
      });
      // the last cut interval should reach all the way to 1, not up to the
      // largest random number
      goals.push(goals.pop() + 1 - lastCut);
      goals = _.shuffle(goals);
      Players.remove({});
      names.forEach(function(name, id) {
        Players.insert({name: name, votes: 0, goal: 100 * goals[id]});
      });
    };
    newGame();
    var clockId = Clock.findOne()._id;
    var initialClock = 28;
    var clock = initialClock;
    var interval = Meteor.setInterval(function () {
      clock -= 1;
      Clock.update(clockId, {$set: {clock: clock}});
      if(clock <= 0) {
        clock = initialClock;
        newGame();
      }
    }, 1000);
  });

  Meteor.publish('clock', function() {
    return Clock.find({});
  });
  Meteor.publish('players', function () {
    return Players.find({});
  });
}
