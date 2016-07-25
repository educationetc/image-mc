import { Meteor } from 'meteor/meteor';
import { Responses } from '../mongo/responses.js';
import { Reflections } from '../mongo/reflections.js';

var nonCalc = [{q:0,a:'A'},{q:1,a:'B'},{q:2,a:'C'},{q:3,a:'D'},{q:4,a:'E'},{q:5,a:'A'},{q:6,a:'B'},{q:7,a:'C'},{q:8,a:'A'},{q:9,a:'B'},{q:10,a:'C'},{q:11,a:'D'},{q:12,a:'E'},{q:13,a:'A'},{q:14,a:'B'},{q:15,a:'C'},{q:16,a:'A'},{q:17,a:'B'},{q:18,a:'C'},{q:19,a:'D'},{q:20,a:'E'},{q:21,a:'A'},{q:22,a:'B'},{q:23,a:'C'}],
  calc = [{q:24,a:'A'},{q:25,a:'B'},{q:26,a:'C'},{q:27,a:'D'},{q:28,a:'A'},{q:29,a:'B'},{q:30,a:'C'},{q:31,a:'D'},{q:32,a:'A'},{q:33,a:'B'},{q:34,a:'C'},{q:35,a:'D'}],
  students = null;

Meteor.startup(() => {
  students = JSON.parse(Assets.getText('students.json'));
});

Meteor.methods({
	'getTest': function(studentId) {

		if (!students[studentId])
			throw new Meteor.Error('User not found.');

    var t = getTestIndex(studentId),
      b = buildTests(studentId);

    if (t > 2)
      throw new Meteor.Error('You have completed all of the problems.');

    return { questions: b.slice(12 * t, 12 * t + 12), testIndex: t, name: students[studentId].name };
	},

  'insertTest': function(studentId, testIndex, responses, reflection) {
    Responses.insert({
      studentId: studentId,
      testIndex: testIndex,
      responses: responses,
      createdAt: Date.now()
    }, function (err, res) {
      Reflections.insert({
        _id: res,
        reflection: reflection,
      });
    });
  }
});

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

function shuffle(arr, studentId) {
  var seed = String(hash(String(studentId * 31))), c = arr.slice(0), r = [], i = 0;

  while (c.length > 0) {

    if (!seed)
      seed = String(hash(String(studentId * 31)));

    i = seed.charCodeAt(0) % c.length;
    seed = seed.substring(1);

    r.push(c[i]);
    c.splice(i, 1);
  }

  return r;
}

function buildTests(studentId) {
  var c = shuffle(calc, studentId),
    nc = shuffle(nonCalc, studentId);

  return nc.slice(0, 8).concat(c.slice(0, 4), nc.slice(8, 16), c.slice(4, 8), nc.slice(16, 24), c.slice(8, 12));
}

function getTestIndex(studentId) {
  var r = Responses.find({ studentId: studentId });
  return r ? r.fetch().length : 0;
}