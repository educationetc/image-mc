import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';
import './main.html';

/**
* Render the login page when first routed anywhere
*/
Router.route('/:anything(.*)', function() {
	BlazeLayout.render('login');
});

/*
* ======================================= Student Template ==============================================
*/

Template.student.helpers({
	/**
	* @return {String} the URL of the image corresponding to the current question
	*/
	image() {
		return (Session.get('questionIndex') < 8 ? 'non-calc/' : 'calc/') + Session.get('questions')[(parseInt(Session.get('questionIndex')))].q + (Session.get('mode') === 'check' ? 's' : '') + '.png';
	},

	/**
	* Create an array of empty values for handlebars to iterate through while rendering the nav buttons
	* @return {String[]} the array
	*/
	length() {
		if (!Session.get('questions'))
			return 0;

		return fillArray('', 12);
	},

	/**
	* @return {String} the remaining time in the current mode (formatted as '0:00')
	*/
	time() {
		return Session.get('time');
	},

	/**
	* @return {Integer} the question number (not index)
	*/
	question() {
		return Session.get('questionIndex') + 1;
	},

	/**
	* @return {Boolean} a boolean representation of whether the mode is 'test'
	*/
	isTest() {
		return Session.get('mode') === 'test';
	},

	/**
	* @return {Boolean} a boolean representation of whether the mode is 'done'
	*/
	isDone() {
		return Session.get('mode') === 'done';
	},

	/**
	* Dynamic footer helper
	* @return {String} the template name of the footer to be rendered
	*/
	footer() {
		return Session.get('mode') + '-footer';
	},

	/**
	* Get the css class which a certain questionIndex's nav button should be styled with
	* @param {Integer} the questionIndex
	* @return {String} the css class ('default' for an omitted response, 'success' for a correct response, and 'danger' for an incorrect response)
	*/
	buttonClass(questionIndex) {
		return Session.get('mode') === 'test' ? 'default' : (Session.get('questions')[questionIndex].a === Session.get('responses')[questionIndex] ? 'success' : 'danger');
	},

	/**
	* Get the css class which a certain questionIndex's nav button should be styled with
	* @param {Integer} the questionIndex
	* @return {String} the css class ('answered' is the question was answered, '' is omitted)
	*/
	buttonClassTwo(questionIndex) {
		return Session.get('responses')[questionIndex] !== 'O' && Session.get('mode') === 'test' ? ' answered' : '';
	},

	/**
	* Check if a given questionIndex is the current questionIndex
	* @param {Integer} the questionIndex
	* @return {Boolean} a boolean representation of whether the questionIndex is the current questionIndex
	*/
	active(questionIndex) {
		return Session.get('questionIndex') === questionIndex;
	}
});

Template.student.events({
	/**
	* Goto a different question using the nav buttons
	*/
	'click .tabs': function(event, instance) {
		changeQuestion(event.target.textContent - 1);
	},

	/**
	* Goto the previous question
	*/
	'click #previous': function(event, instance) {
		changeQuestion(Session.get('questionIndex') - 1);
	},

	/**
	* Goto the next question
	*/
	'click #next': function(event, instance) {
		changeQuestion(Session.get('questionIndex') + 1);
	},
	'click #finish':function(event,instance){
		if(Session.get('mode') === 'test'){
			sweetAlert({
				title:'Are you sure?',
				text:'Are you sure you want to submit your answers? You can\'t go back.',
				type:'warning',
				showCancelButton: true,
				confirmButtonColor: '#DD6B55',
				confirmButtonText: 'Yes, continue to solutions!',
				cancelButtonText: 'No, I\'m not done!',
				closeOnConfirm: true,
				closeOnCancel: true
			},
			function(isConfirm){
				if(isConfirm)
					testMode();
			});
		}else if(Session.get('mode') === 'check'){
			sweetAlert({
				title:'Are you sure?',
				text:'Are you sure you want to submit your responses? You can\'t go back.',
				type:'warning',
				showCancelButton: true,
				confirmButtonColor: '#DD6B55',
				confirmButtonText: 'Yes, I\'m done!',
				cancelButtonText: 'No, I\'m not done!',
				closeOnConfirm: true,
				closeOnCancel: true
			},
			function(isConfirm){
				if(isConfirm)
					checkMode();
			});
		}else{
			BlazeLayout.render('login');
		}
	}
});

/**
* Intialize and call the resize listener
*/
Template.student.onRendered(function () {
	$(window).resize(resizeStudent);
	$(resizeStudent);
});

/**
* Function to be called on the resize of the student view
* Pads the question/solution images according to the window size
*/
function resizeStudent() {
	var t = $('#navbar-top').height(),
		b = $('#navbar-bottom').height();

	$(document.body).css({
		'padding-top': (t ? t : 0) + 'px',
		'padding-bottom': (b ? b : 0) + 'px'
	});
}

/**
* Update the time displayed, and handle the countdown reaching 0
*/
function updateTime() {
	var n = 1000 * 60 * (Session.get('mode') === 'test' ? .1 : 5) - Date.now() + Session.get('start-time');
	console.log(n);

	//time ran out
	if (n < 0) {
		Session.get('mode') === 'test' ? testMode() : checkMode(); //switch to the appropriate mode
		return Session.set('time', '0:00');
	}

  	Session.set('time', parseInt(n / 1000 / 60) + ':' + ('0' + parseInt(n / 1000 % 60)).slice(-2)); //build the time string
}

/**
* Transitions from test mode to check mode
*/
function testMode(){
	changeQuestion(0);
	Session.set('start-time', Date.now());
	Session.set('mode', 'check');
}

/**
* Transitions from check mode to done mode
*/
function checkMode(){
	//query the server to insert the new result
	Meteor.call('insertResult', Session.get('studentId'), Session.get('testIndex'), Session.get('responses'), $('#comment').val(), function (err, res) {
		if (err)
			return nofity(err.error, true);
	});

	window.clearInterval(Session.get('intervalHandle')); //stop the countdown
	Session.set('mode', 'done');
	notify('Responses Submitted!', false);
}

/**
* Change the question being displayed
* @param {Integer} the questionIndex to change to
*/
function changeQuestion(questionIndex) {
	//return if they're trying to change to an invalid questionIndex
	if (questionIndex < 0 || questionIndex > 11)
		return;

	if (Session.get('mode') === 'test') {
		$('input').prop('checked', false); //uncheck all of the multiple choice radio buttons

		//check the radio button corresponding to their response at questionIndex (if they have responded to the question at questionIndex)
		$('input').filter(function() {
  			return this.value === Session.get('responses')[questionIndex];
  		}).prop('checked', true);
  	}

  	Session.set('questionIndex', questionIndex);
  	resizeStudent();
}

/*
* ======================================= Teacher Template ==============================================
*/

Template['teacher'].helpers({
	/**
	* Get the elapsed time since a given time
	* @param {Integer} a millisecond representation of the time
	* @return {String} a string representation of the elapsed time
	*/
	when(time) {
		if(time === 0)
			return '';
	
		var t = Date.now() - time
			, s = t / 1000
			, str = '';
	
		if(s / 86400 > 1)
			str = (~~(s / 86400)) + ' days ago'
		else if(s / 3600 > 1)
			str = (~~(s / 3600)) + ' hours ago'
		else if((s / 60) > 1)
			str = (~~(s / 60)) + ' minutes ago'
		else
			str = ~~s + ' seconds ago'
	
		return parseInt(str.split(' ')[0]) === 1 ? (str.substring(0, str.length - 5) + str.substring(str.length - 4)) : str; //if its not plural drop the 's'
	},

	/**
	* @return {Integer} the current resultIndex
	*/
	resultIndex() {
		return parseInt(Session.get('resultIndex'));
	},

	/**
	* @return {Integer} the current questionIndex
	*/
	questionIndex() {
		return parseInt(Session.get('questionIndex'));
	},

	/**
	* Get all of the multiple choice responses submitted by the student from a certain result
	* @param {Integer} the resultIndex of the result
	* @return {String[]} all of the student's multiple choice responses
	*/
	getResponses(resultIndex) {
		return Session.get('results')[resultIndex].responses;
	},

	/**
	* Get the correct multiple choice answer to certain question from a certain result
	* @param {Integer} the resultIndex of the result
	* @param {Integer} the questionIndex of the question
	* @return {String} the correct multiple choice answer to that question
	*/
	answer(resultIndex, questionIndex) {
		return Session.get('results')[resultIndex].test[questionIndex].a;
	},

	/**
	* Get the multiple choice response submitted by the student to a certain question from a certain result
	* @param {Integer} the resultIndex of the result
	* @param {Integer} the questionIndex of the question
	* @return {String} the response multiple choice response for that question
	*/
	response(resultIndex, questionIndex) {
		var r = Session.get('results')[resultIndex].responses[questionIndex];
		return r === 'O' ? 'Omitted' : r;
	},

	/**
	* @return {Object[]} all of the results
	*/
	results() {
		return Session.get('results');
	},

	/**
	* Get the first name of a student who owns a certain result
	* @param {Integer} the resultIndex of the result
	* @return {String} the student's first name
	*/
	firstName(resultIndex) {
		return Session.get('results')[resultIndex].name.split(', ')[1].split(' ')[0];
	},

	/**
	* Get the reflection of a certain result
	* @param {Integer} the resultIndex
	* @return {String} the reflection 
	*/
	reflection(resultIndex) {
		return Session.get('results')[resultIndex].reflection;
	},

	/**
	* Get the URL of the image to display
	* @param {Integer} the resultIndex of the results which are being viewed
	* @param {Integer} the questionIndex of the question which is being viewed
	* @return {String} the URL of the image
	*/
	image(resultIndex, questionIndex) {
		return (questionIndex < 8 ? 'non-calc/' : 'calc/') + Session.get('results')[resultIndex].test[questionIndex].q + (Session.get('mode') === 'solution' ? 's' : '') + '.png';
	},

	/**
	* @return {String} the current image mode ('question' or 'solution')
	*/
	mode() {
		return Session.get('mode');
	},

	/**
	* Get the grade of a given result
	* @param {Integer} a resultIndex
	* @return {Integer} the grade of the result at the resultIndex 
	*/
	grade(resultIndex) {
		return parseInt(Session.get('results')[resultIndex].grade);
	},

	/**
	* @return {Integer} the current testIndex
	*/
	testIndex() {
		return parseInt(Session.get('testIndex'));
	}
});

Template.teacher.events({
	/**
	* View the results of a different test
	*/
	'click .tr-click': function(event, instance) {
		Session.set('questionIndex', 0);
		Session.set('resultIndex', $(event.currentTarget).attr('name'));
	},

	/**
	* Goto a different question using the nav buttons
	*/
	'click .tabs': function(event, instance) {
		Session.set('questionIndex', $(event.currentTarget).attr('id'));
	},

	/**
	* Goto the previous question
	*/
	'click #previous': function(event, instance) {
		var current = Session.get('questionIndex');
		Session.set('questionIndex', current > 0 ? current - 1 : 0);
	},

	/**
	* Goto the next question
	*/
	'click #next': function(event, instance) {
		var current = Session.get('questionIndex');
		Session.set('questionIndex', current < 11 ? current + 1 : 11);
	},

	/**
	* Switch to question mode
	*/
	'click #question-mode': function(event, instance) {
		Session.set('mode', 'question');
	},

	/**
	* Switch to solution mode
	*/
	'click #solution-mode': function(event, instance) {
		Session.set('mode', 'solution');
	},

	/**
	* Change the grade given to a test
	*/
	'click .grade': function(event, instance) {
		var arr = $(event.currentTarget).attr('name').split(' '), //the grade element's name contains its resultIndex and percentage grade, separated by a space
			r = Session.get('results');

		//update the grade locally
		r[parseInt(arr[0])].grade = parseInt(arr[1]);
		Session.set('results', r);

		//query the server to update the grade in the database
		Meteor.call('updateGrade', Session.get('results')[arr[0]]._id, parseInt(arr[1]));
	},

	/**
	* Download CSV
	*/
	'click #csv': function(event, instance) {
		var element = document.createElement('a');

  		element.setAttribute('href', 'data:text/plain;charset=utf-8,' + buildCSV());
  		element.setAttribute('download', 'grades.csv');
  		element.style.display = 'none';
  		document.body.appendChild(element);
  		element.click();
  		document.body.removeChild(element);
	},

	/**
	* Export to google spreadsheet
	*/
	'click #sheets': function(event, instance) {
		Meteor.call('updateSheet', buildCSV(), function(err, res) {
			if (err)
				return nofity(err.error, true);

			notify('Google Spreadsheet updated!', false);
		});
	},

	/**
	* Change the testIndex when a new testIndex is clicked
	*/
	'click .change-test-index': function(event, instance) {
		var index = parseInt($(event.currentTarget).attr('name')),
			previous = parseInt(Session.get('testIndex'));

		Session.set('testIndex', index);

		//if the testIndex changed, set the selected table row to the first row in this testIndex's view
		if (index !== previous)
			Session.set('resultIndex', getFirstStudentInTableIndex());	
	},
	//signout button
	'click #signout':function(event, instance){
		sweetAlert({
			title:'Are you sure you want to sign out?',
			type:'warning',
			showCancelButton: true,
			confirmButtonColor: '#DD6B55',
			confirmButtonText: 'Yes',
			cancelButtonText: 'No',
			closeOnConfirm: true,
			closeOnCancel: true
		},
		function(isConfirm){
			if(isConfirm){
				BlazeLayout.render('login');
			}
		});
	},
});

/**
* Get the results whose testIndex match the current testIndex
* @return {Object[]} an array of results
*/
function getCurrentTestResults() {
	var res = [];
	for (var i = 0; i < Session.get('results').length; i++)
		if (parseInt(Session.get('results')[i].testIndex) === parseInt(Session.get('testIndex')))
			res.push(Session.get('results')[i]);
	return res;
}

/**
* Get the resultIndex of the first result in the table (the first result whose testIndex matches the current testIndex)
* @return {Integer} the resultIndex of the result
*/
function getFirstResultInTableIndex() {
	for (var i = 0; i < Session.get('results').length; i++)
		if (Session.get('results')[i].testIndex === Session.get('testIndex'))
			return i;
}

/**
* Builds a csv file containing the results at the current testIndex
* @return {String} an encoded and ready-to-be-downloaded csv file
*/
function buildCSV() {
	var r = getCurrentTestResults(),
		s = '';
	for (var i = 0; i < r.length; i++)
			s += (r[i].studentId + ',' + (((!r[i].grade && r[i].grade !== 0) || r[i].grade === -1) ? 'N/A' : r[i].grade) + '\n');
	return encodeURIComponent(s);
}

/**
* Function to be called on the resize of the teacher view
* Adjusts the height of the scrollable table according to the window size
*/
function resizeTeacher() {
	var size = ($(window).height() - $('#teacher-nav').height() - $('#test-selector').height()) + 'px';
	$('#table-scroll').css('max-height', size);
}

/*
* ======================================= Login Template ==============================================
*/

Template.teacher.onRendered(function(){
	$(window).resize(resizeTeacher);
	$(resizeTeacher);
});

Template.login.events({
	/**
	* log in if the user presses enter
	*/
	'keydown #student-id': function(event, instance) {
		if(event.which === 13)
			login();
	},

	/**
	* log in if the user clicks submit
	*/
	'click #student-id-submit': function() {
		login();
	}
});

/**
* Attempt to login a user by student id
*/
function login() {
	var id = $('#student-id').val();
	if (!id)
		return shakeInput();

	//query the server
	Meteor.call('getTest', id, function(err, res) {
		//there was an error
		if (err) {
			shakeInput();
			return notify(err.error, true);
		}

		//the teacher id was used to log in
		if (res.mode && res.mode === 'teacher') {
			//tally up all student's scores
			for (var i = 0; i < res.res.length; i++) {
				var correct = 0;
				for (var j = 0; j < res.res[i].responses.length; j++)
					if (res.res[i].responses[j] === res.res[i].test[j].a)
						correct++;
				res.res[i].score = correct + '/' + res.res[i].responses.length;
			}

			//intialize session variables
			Session.set('mode', 'question');
			Session.set('testIndex', 0);
			Session.set('questionIndex', 0);
			Session.set('results', res.res);
			Session.set('resultIndex', getFirstResultInTableIndex());
 			
			return BlazeLayout.render('teacher');
		}

		//intialize session variables
		Session.set('studentId', id);
		Session.set('testIndex', res.testIndex);
		Session.set('mode', 'test');
		Session.set('start-time', Date.now());
		Session.set('questions', res.questions);
		Session.set('questionIndex', 0);
		Session.set('responses', fillArray('O', 12)); //'O' signifies omitted

		//initialize the countdown
		updateTime();
		Session.set('intervalHandle', window.setInterval(updateTime, 1000)); //this handle will be later used to disable the recurrent update time function call

		//welcome the user by their first name
		notify('Welcome ' + res.name.split(', ')[1].split(' ')[0] + '!');
		return BlazeLayout.render('student');
	});
}


/**
* Shake the student id input box to signify an invalid id
*/
function shakeInput() {
	var input = $('#student-id');
	input.addClass('shake');
	input.css('border', '3px solid red');

	setTimeout(() => {
		input.css('border', '3px solid #e6e6e6');
		input.removeClass('shake')
	}, 1000);
}

/*
* ======================================= Global/Miscellaneous ==============================================
*/

/**
* Increment an integer by one (to convert from index to number)
* @param {Integer} the integer
* @return {Integer} the integer plus one
*/
Template.registerHelper('add', function(num) {
	return num + 1;
});

/**
* Check if two objects are equal
* @param {Object} the first object
* @param {Object} the second object
* @return {Boolean} a boolean representing their equality
*/
Template.registerHelper('equal', function(a, b) {
	return a === b;
});


Template['test-footer'].helpers({
	/**
	* @return {String} the current question type
	*/
	type() {
		return Session.get('index') < 8 ? 'non-calculator' : 'calculator';
	},

	/**
	* @return {String} the current question suggested time
	*/
	suggested() {
		return (Session.get('index') < 8 ? '2' : '3') + ' minutes';
	}
});

Template['test-footer'].events({
	/**
	* Listen for radio button changes and update the stored responses accordingly
	*/
	'change input': function (event, instance) {
		var r = Session.get('responses'),
			ans = $('input:checked').val();
	
		r[Session.get('questionIndex')] = ans;
	
		if (ans)
			Session.set('responses', r);
	}
});

Template['check-footer'].helpers({
	/**
	* @return {String} the correct answer to the current question
	*/
	correct() {
		return Session.get('questions')[Session.get('questionIndex')].a;
	},

	/**
	* @return {String} the student response to the current question
	*/
	response() {
		var r = Session.get('responses')[Session.get('questionIndex')];
		return r === 'O' ? 'Omitted' : r;
	}
});

/**
* Send a popup to the user
* @param {String} the message to be sent
* @param {Boolean} true for an error popup, false for a success popup
*/
function notify(text, isError) {
	$('body').append('<div id="message" class="' + (isError ? 'error' : 'success') + '">' + text + '</div>');
	$('#message').fadeIn(1000);

	setTimeout(() => $('#message').fadeOut(1000), 2000);
	setTimeout(() => $('#message').remove(), 3000);
}

/**
* Fill an array with a set value
* @param {Object} the value to fill the array with
* @param {Integer} the length of the array to be returned
* @return {Object[]} the filled array
*/
function fillArray(val, length) {
	var a = [];
	for (var i = 0; i < length; i++)
		a.push(val);

	return a;
}