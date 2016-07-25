import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import './main.html';

Router.route('/', function() {
	BlazeLayout.render('app');
});


Template.app.helpers({
  add(num) {
  	return num + 1;
  },

  signedIn() {
  	return Session.get('questions') ? true : false;
  },

  image() {
  	console.log(Session.get)
  	return (Session.get('index') < 8 ? 'non-calc/' : 'calc/') + Session.get('questions')[(parseInt(Session.get('index')))].q + (Session.get('mode') === 'check' ? 's' : '') + '.png';
  },

  length() {
  	if (!Session.get('questions'))
  		return 0;

  	var res = [];

  	for (var i = 0; i < 12; i++)
  		res.push('');

  	return res;
  },

  time() {
  	return Session.get('time');
  },

  answered(index) {
  	return Session.get('responses')[index] !== 'F' && Session.get('mode') === 'test' ? ' answered' : '';
  },

  question() {
  	return Session.get('index') + 1;
  },

  isTestMode() {
  	return Session.get('mode') === 'test';
  },

  footer() {
  	return Session.get('mode') + '-footer';
  },

  correct(index) {
  	return Session.get('mode') === 'test' ? 'default' : (Session.get('questions')[index].a === Session.get('responses')[index] ? 'success' : 'danger');
  },

  changePadding() {
  	changePadding();
  }
});

Template['test-footer'].helpers({
  type() {
  	return Session.get('index') < 8 ? 'non-calculator' : 'calculator';
  },

  suggested() {
  	return (Session.get('index') < 8 ? '2' : '3') + ' minutes';
  }
});

Template['check-footer'].helpers({
	correct() {
		return Session.get('questions')[Session.get('index')].a;
	},

	response() {
		var r = Session.get('responses')[Session.get('index')];
		return r === 'F' ? 'Omitted' : r;
	},

	equal(a, b) {
		return a === b;
	}
});

function updateTime() {
	var n = 1000 * 60 * (Session.get('mode') === 'test' ? 1 : 1) - Date.now() + Session.get('start-time');

	if (n < 0) {
		if (Session.get('mode') == 'test') {
			changeProblem(0);
			Session.set('start-time', Date.now());
			Session.set('mode', 'check');
		} else {
			var r = [];
			$.each((Session.get('responses'), function(key, val) {

			});

			Meteor.call('insertTest', Session.get('studentId'), Session.get('testIndex'), Sessin)
		}

		return '0:00';
	}

  	Session.set('time', parseInt(n / 1000 / 60) + ':' + ('0' + parseInt(n / 1000 % 60)).slice(-2));
}

function changeProblem(index) {
	if (num < 0 || num > 11)
			return;
	
	if (Session.get('mode') === 'test') {
		var r = Session.get('responses'),
			ans = $('input:checked').val();
	
		r[Session.get('index')] = ans;
	
		if (ans)
			Session.set('responses', r);
	
		$('input').prop('checked', false);
	
		Session.set('index', num);
	
		$('input').filter(function() {
  			return this.value === Session.get('responses')[Session.get('index')];
  		}).prop('checked', true);
  	} else {
  		Session.set('index', num);
  	}
}

Template.app.events({
	'click .tabs': function(event, instance) {
		changeProblem(event.target.textContent - 1);
	},

	'click #student-id-submit': function(event, instance) {
		var id = $('#student-id').val();

		if (!id)
			return alert('Please enter a student-id.');


		Meteor.call('getTest', id, function(err, res) {
			if (err)
				return alert(err);

			if (!res)
				return alert('User not found.')

			Session.set('studentId', id);
			Session.set('testIndex', res.testIndex);
			Session.set('mode', 'test');
			Session.set('start-time', Date.now());
			Session.set('questions', res.questions);
			Session.set('index', 0);
			Session.set('responses', fillArray('F', 12));

			updateTime();
		});
	},

	'click #previous': function(event, instance) {
		changeProblem(Session.get('index') - 1);
	},

	'click #next': function(event, instance) {
		changeProblem(Session.get('index') + 1);
	}
});

function changePadding() {
	var t = $('#navbar-top').height();
	var b = $('#navbar-bottom').height();

	$(document.body).css({
		'padding-top': (t ? (t + 'px') : '0px'),
		'padding-bottom': (b ? (b + 'px') : '0px')
	});
}

function fillArray(val, length) {
	var a = [];
	for (var i = 0; i < length; i++)
		a.push(val);

	return a;
}

$(window).on('resize', changePadding);
        
setInterval(updateTime, 1000);