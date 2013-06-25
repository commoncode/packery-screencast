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

    if(Tickets.find({}).count() > 40) {
      seed();
    }
  }, 5000);

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
        gutter: 10,
        columnWidth: 100,
        rowHeight: 100
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

          // Seems that we could bind draggie to only new elements
          // but for now this works
          for (var i = self.inst.getItemElements().length - 1; i >= 0; i--) {
            self.draggie = new Draggabilly( self.inst.getItemElements()[i], {
              handle: '.draggie'
            });
            self.inst.bindDraggabillyEvents( self.draggie );
          };

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

  Template.ticket.events({
    'click .stamp': function(event, template) {

      if(!_.contains(MyPackery.inst.stampedElements, template.firstNode)) {
        MyPackery.inst.stamp(template.firstNode);
        console.log('... stamping: ' + this._id);
      } else {
        MyPackery.inst.unstamp(template.firstNode);
        console.log('... unstamping: ' + this._id);
      }
    },
    'click .fitter': function(event, template) {
      event.preventDefault();
      if(template.firstNode.classList.contains('fit')){
        console.log('... un-fitting');
        template.firstNode.classList.remove('fit');
        MyPackery.inst.unstamp(template.firstNode);
        MyPackery.inst.layout();

      } else {
        console.log('... fitting');
        template.firstNode.classList.add('fit')

        fitCount = 0;
        for (var i = MyPackery.inst.getItemElements().length - 1; i >= 0; i--) {
          if(MyPackery.inst.getItemElements()[i].classList.contains('fit')){
            fitCount++;
          }
        };
        MyPackery.inst.fit(
          template.firstNode,
          (fitCount-1) * MyPackery.inst.columnWidth, 0);

        MyPackery.inst.stamp(template.firstNode);
      }

    }

  })
}
/*****************************************************************************/
