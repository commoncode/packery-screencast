/************************ Collections ****************************************/
Tickets = new Meteor.Collection('tickets');
var cursor = Tickets.find({}, {sort: {priority:1}});

function reset () {
  Tickets.remove({});
}

function seed () {
  reset();
  for (var i = 0; i < 5; i++) {
    Tickets.insert({
      subject: 'Ticket ' + i,
      description: 'Some description for the ticket',
      priority: Math.round(Math.random() * 10)
    });
  }
}
/*****************************************************************************/

/************************ Server *********************************************/
if (Meteor.isServer) {
  Meteor.startup(seed);

  Meteor.publish('tickets', function () {
    return cursor;
  });

  Meteor.setInterval(function(){
    var ticketNumber = Math.round(Math.random() * 99)
    Tickets.insert({
      subject: 'Ticket Order' + ticketNumber,
      description: 'Some description for the ticket',
      priority: ticketNumber
    });
  }, 2000);

}
/*****************************************************************************/

/************************ Client *********************************************/




if (Meteor.isClient) {
  var sub = Meteor.subscribe('tickets');

  MyPackery = {
    // Singleton instance
    inst: null,

    // Use underscore's _.once functio to make sure this is only called
    // once. Subsequent calls will just return.
    init: _.once(function (container) {
      MyPackery.inst = new Packery(container, {
        itemSelector: '.card',
        gutter: 10
      });
    }),

    update: function () {
      var self = this;
      if (this.inst) {
        // Wait until dependencies are flushed and then force a layout
        // on our packery instance
        Deps.afterFlush(function () {

          self.inst.reloadItems();

          if(self.inst.stampedElements.length) {

            // Seems to be necessary to unstamp and restamp elements
            // being careful to take a cloned copy of the stampedElements
            // Array, else we lose the references in the unstamping
            var stampedElements = self.inst.stampedElements.slice(0)
            self.inst.unstamp(self.inst.stampedElements);
            self.inst.stamp(stampedElements);

          }

          self.inst.layout();
        });
      }
    },

    observeChanges: function (cursor) {
      // Call observeChanges after the {{#each}} helper has had a chance
      // to execute because it also uses observeChanges and we want our code
      // to run after Meteor's. This way Spark will be done with all the
      // rendering work by the time this code is called.
      Meteor.startup(function () {
        cursor.observeChanges({
          addedBefore: function (id) {
            MyPackery.update();
          },

          movedBefore: function (id) {
            MyPackery.update();
          },

          removed: function (id) {
            MyPackery.update();
          }
        });
      });
    }
  };

  // Initialize packery on the first render of the ticketGrid
  Template.ticketGrid.rendered = function () {
    MyPackery.init(this.firstNode);
  };

  // Respond to added, moved, removed callbacks on the
  // tickets cursor
  MyPackery.observeChanges(cursor);

  Template.ticketGrid.helpers({
    tickets: function () {
      return cursor;
    }
  });

  //
  // Ticket helpers & events
  //

  Template.ticket.preserve({
    //
    // Preserve the bubble element so we don't lose our
    // position in the packery.
    '.card': function (node) {
      console.log('... ... ... preserving: ' + node.id);
      return node.id;
    }
  });

  Template.ticket.events({
    'click .card': function(event, template) {

      if(!Session.get('stampedCard_' + this._id)) {
        MyPackery.inst.stamp(template.firstNode);
        Session.set('stampedCard_' + this._id, true);
        console.log('... stamping: ' + this._id);
      } else {
        MyPackery.inst.unstamp(template.firstNode);
        Session.set('stampedCard_' + this._id, false);
        console.log('... unstamping: ' + this._id);
      }
    }
  })
}
/*****************************************************************************/
