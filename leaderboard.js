// Set up a collection to contain player information. On the server,
// it is backed by a MongoDB collection named "players".

Players = new Meteor.Collection("players");
Users = new Meteor.Collection("users");
Clock = new Meteor.Collection("clock");

if (Meteor.isClient) {
  if (!Session.get('sessionId')) {
    var sessionId = Users.insert({'loggedIn': true, 'date': new Date()});
    Session.set('sessionId', sessionId);
  }
  Template.leaderboard.sessionId = function() {
    return Session.get('sessionId');
  };
  Template.leaderboard.clock = function() {
    var ret = Clock.findOne();
    if (ret) {
      return ret.clock;
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
      }
      Session.set("selected_player", this._id);
      Players.update(this._id, {$inc: {score: 1}});
    }
    
  });
}

// On server startup, create some players if the database is empty.
if (Meteor.isServer) {
  Meteor.startup(function () {
    if (Players.find().count() === 0) {
      var perc = [];
      var names = ["Ada Lovelace",
                   "Grace Hopper",
                   "Marie Curie",
                   "Carl Friedrich Gauss",
                   "Nikola Tesla",
                   "Claude Shannon"];
      for (var i = 0; i < names.length; i++)
        perc.push(5+Random.fraction()*10);

      var nrmlz = perc.reduce(function(a,b) { return a+b; });
      for (var i = 0; i < names.length; i++)
        Players.insert({name: names[i], score: 0, goal: perc[i] / nrmlz});
      
    }
    var initialClock = 30;
    var clockId = Clock.insert({clock: initialClock});
    var clock = initialClock;
    var interval = Meteor.setInterval(function () {
      clock -= 1;
      Clock.update(clockId, {$set: {clock: clock}});
      if(clock <= 0) {
        clock = initialClock;
        //Meteor.clearInterval(interval);
        // new game?
      }
    }, 1000);
    
  });
}
