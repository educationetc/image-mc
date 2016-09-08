import { Meteor } from 'meteor/meteor';
import { Responses } from '../mongo/responses.js';
import { Reflections } from '../mongo/reflections.js';

var nonCalc = [{q:0,a:'A'},{q:1,a:'B'},{q:2,a:'C'},{q:3,a:'D'},{q:4,a:'E'},{q:5,a:'A'},{q:6,a:'B'},{q:7,a:'C'},{q:8,a:'A'},{q:9,a:'B'},{q:10,a:'C'},{q:11,a:'D'},{q:12,a:'E'},{q:13,a:'A'},{q:14,a:'B'},{q:15,a:'C'},{q:16,a:'A'},{q:17,a:'B'},{q:18,a:'C'},{q:19,a:'D'},{q:20,a:'E'},{q:21,a:'A'},{q:22,a:'B'},{q:23,a:'C'}],
  calc = [{q:24,a:'A'},{q:25,a:'B'},{q:26,a:'C'},{q:27,a:'D'},{q:28,a:'A'},{q:29,a:'B'},{q:30,a:'C'},{q:31,a:'D'},{q:32,a:'A'},{q:33,a:'B'},{q:34,a:'C'},{q:35,a:'D'}],
  students = null,
  random = false;

Meteor.startup(() => {
  students = JSON.parse(Assets.getText('students.json'));
});

Meteor.methods({
  /**
  * Get either all of the test results a the teacher account, or the next test object to be taken as a student
  * @param {Integer} the student id of the test owner (27182 for teacher)
  */
	'getTest': function(studentId) {
    //teacher login
    if (studentId === '27182'||studentId === '19856') {
      var r = Responses.find({}, { sort: {createdAt: -1} }),
        arr = r ? r.fetch() : [],
        res = [];

      for (var i = 0; i < arr.length; i++) {
        var ref = Reflections.findOne({ _id: arr[i]._id });

        res.push({
          studentId: arr[i].studentId,
          name: students[arr[i].studentId].name,
          period: students[arr[i].studentId].period,
          responses: arr[i].responses,
          reflection: ref ? ref.reflection : '',
          testIndex: arr[i].testIndex,
          test: getTest(arr[i].studentId, arr[i].testIndex),
          createdAt: arr[i].createdAt,
          _id: arr[i]._id,
          grade: arr[i].grade
        });
      }

      return { mode: 'teacher', res: res, random: random };
    }

    //student login
		if (!students[studentId])
			throw new Meteor.Error('User not found.');

    var t = getTestIndex(studentId);

    return { questions: getTest(studentId, t), testIndex: t, name: students[studentId].name };
	},

  /**
  * Insert a test result
  * @param {Integer} the studentId of the test owner
  * @param {Integer} the index of the test
  * @param {String[]} the student's responses
  * @param {String} the student's reflection
  */
  'insertResult': function(studentId, testIndex, responses, reflection) {
    Responses.insert({
      studentId: studentId,
      testIndex: testIndex,
      responses: responses,
      grade: -1, //grade is initialized to -1 to signify no grade, it can be later updated using the teacher view
      createdAt: Date.now()
    }, function (err, res) {
      Reflections.insert({
        _id: res, //the reflection and response entries for a certain result share the same _id in mongo
        reflection: reflection
      });
    });
  },

  /*
  * Update the grade given to a certain result
  * @param {String} the _id of the test entry in mongo
  * @param {Integer} the percentage grade given by the teacher
  */
  'updateGrade': function(testId, percentage) {
    Responses.update(
      {
        _id: testId
      },
      {
        $set: {
          grade: percentage
        }
      }
    );
  },

  /*
  * Export all of the tests of a certain testIndex to google sheets, for input into powerschool
  * @param {String} a URI encoded strign formatted as a CSV file representing the results
  */
  'updateSheet': function(data) {
    //send the data to a listener script on the spreadsheet using a get request
    HTTP.call( 'GET', 'https://script.google.com/macros/s/AKfycbxf04KlyujdhvBTOO5qW-Q6UM6nj5aX4dyth5GGt6GjeFa9I44/exec?data=' + data, {}, function(err, res) {
      if (err || (res.data.result || '') !== 'success')
        throw new Meteor.Error('Google Spreadsheet could not be updated.');
    });
  },

  'setRandomization': function(randomVal) {
    random = randomVal;
  }
});

/*
* Hash a string
* @param {String} the string being hashed
* @return {String} the hashed string
*/
function hash(s) {
  var hash = 0, i, chr, len;
  if (s.length === 0)
    return hash;

  for (i = 0, len = s.length; i < len; i++) {
    chr   = s.charCodeAt(i);
    hash  = ((hash << 5) - hash) + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return hash;
}

/* 
* Shuffle an array based on an integer (multiple calls using the same array and integer will yield the same shuffled array)
* @param {Object[]} the array to be shuffled (either the calculator or noncalculator questions)
* @param {Integer} the studentId used to shuffle the array
* @return {Object[]} the shuffled array
*/
function shuffle(arr, studentId) {
  var seed = String(hash(String(studentId * 31))), //create a seed string based on the studentId
    c = arr.slice(0), //copy the array
    r = [],
    i = 0;

  //pull elements from the array copy and push them to the result array in a random order, until the copy array is empty
  while (c.length > 0) {

    //if the entire seed was used, recreate it
    if (!seed)
      seed = String(hash(String(studentId * 31)));

    i = seed.charCodeAt(0); //convert the first character of the seed string to an integer
    i %= c.length; //mod by the array length to ensure the integer is in the domain of possible array indexes

    r.push(c[i]); //use the generated index to push a random element to the result array 
    c.splice(i, 1); //remove the pushed element (this algorithm runs until no elements remain)
    seed = seed.substring(1); //remove the first character from the seed so that a different character is used next iteration
  }
  return r;
}

/*
* Get all of the test questions as an array for a certain student
* @param {Integer} the studentId used to randomize the questions
* @return {Object[][]} an array of question arrays (each row represents a different test)
*/
function getTests(studentId) {
  //shuffle the calc and noncalc arrays based on the studentId

  var res = [];
  if (random) {
    var c = shuffle(calc, studentId),
      nc = shuffle(nonCalc, studentId);
  
      //create an array of question arrays, with each row containing 8 noncalc and 4 calc questions
      for (var i = 0; i < 3; i++)
        res.push(nc.slice(i * 8, i * 8 + 8).concat(c.slice(i * 4, i * 4 + 4)));
  } else {
    console.log('random is false');
    for (var i = 0; i < 3; i++)
        res.push(nonCalc.slice(i * 8, i * 8 + 8).concat(calc.slice(i * 4, i * 4 + 4)));
  }
  return res;
}

/*
* Get the testIndex of the next test to be taken by a certain student
* @param the student's studentId
* @return the testIndex of the next test they're taking
*/
function getTestIndex(studentId) {
  var r = Responses.find({ studentId: studentId });
  return r ? r.fetch().length : 0;
}

/*
* Get the question array which makes up a test for a certain student at a certain testIndex
* @param {Integer} the student's studentId
* @param {Integer} the testIndex of the desired test
* @return {Object[]} the question array making up the test
*/
function getTest(studentId, testIndex) {
  if (testIndex > 0)
    throw new Meteor.Error('You have completed all of the problems.'); //CHANGED TO ZERO ATM, CHANGE BACK

  return getTests(studentId)[testIndex];
}