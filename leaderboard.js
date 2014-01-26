// Set up a collection to contain player information. On the server,
// it is backed by a MongoDB collection named "players".

Players = new Meteor.Collection("players");
Users = new Meteor.Collection("users");
Clock = new Meteor.Collection("clock");
Votecount = new Meteor.Collection("votecount");
Games = new Meteor.Collection('game');


if (Meteor.isClient) {
  if (!Session.get('sessionId') || !Users.findOne({_id: Session.get('sessionId') })) {
    var sessionId = Users.insert({'loggedIn': true, 'voted': false});
    Session.set('sessionId', sessionId);
  }
  Template.leaderboard.sessionId = function() {
    return Session.get('sessionId');
  };
  Template.leaderboard.votecount = function() {
    var ret = Votecount.findOne();
    if(ret) {
      return ret.votes;
    }
    return 0;
  };
  Template.leaderboard.clock = function() {
    var ret = Clock.findOne();
    if (ret) {
      return ret.clock;
    }
    return '0';
  };
  Template.leaderboard.gamecount = function() {
    var ret = Games.findOne();
    if (ret) {
      // TODO Session.set('selected_player', undefined);
      return ret.count;
    }
    return '0';
  };
  Template.leaderboard.players = function () {
    return Players.find({}, {sort: {name: 1}});
  };

  Template.leaderboard.selected_name = function () {
    var player = Players.findOne(Session.get("selected_player"));
    return player && player.name;
  };

  Template.player.selected = function () {
    return Session.equals("selected_player", this._id) ? "selected" : '';
  };

  Template.leaderboard.events({
    'click input.inc': function () {
    }

  });

  Template.player.events({
    'click': function () {
      if (Session.get('selected_player')) {
        Players.update(Session.get("selected_player"), {$inc: {score: -1}});
      } else {
        Votecount.update(Votecount.findOne()._id, { $inc: {votes: 1} });
      }
      Session.set("selected_player", this._id);
      Players.update(this._id, {$inc: {score: 1}});
    }
    
  });
}

// On server startup, create some players if the database is empty.
if (Meteor.isServer) {
  Meteor.startup(function () {
    Games.remove({});
    Clock.remove({});
    Players.remove({});
    Games.insert({ count: 0 });

    if (Players.find().count() === 0) {
      var perc = [];
      var names = ["Ada Lovelace",
                   "Grace Hopper",
                   "Marie Curie",
                   "Carl Friedrich Gauss",
                   "Nikola Tesla",
                   "Claude Shannon"];
      for (var i = 0; i < names.length; i++)
        perc.push(Math.floor(Random.fraction()*100));

      var nrmlz = perc.reduce(function(a,b) { return a+b; });
      for (var i = 0; i < names.length; i++)
        Players.insert({name: names[i], score: 0, goal: perc[i] / nrmlz});
        
      Clock.insert({clock: initialClock});
      Votecount.insert({votes: 0});
      
    }
    var clockId = Clock.findOne()._id;
    var votesId = Votecount.findOne()._id;
    var initialClock = 10;
    var clock = initialClock;
    var interval = Meteor.setInterval(function () {
      clock -= 1;
      Clock.update(clockId, {$set: {clock: clock}});
      if(clock <= 0) {
        clock = initialClock;
        Votecount.update(votesId, {votes: 0});
        Games.update(Games.findOne()._id, { $inc: { count: 1}});
        //Users.remove({});
        //Meteor.clearInterval(interval);
        // new game?
      }
    }, 1000);
  });
}
