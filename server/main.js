import { Meteor } from 'meteor/meteor';
import { Responses } from '../mongo/responses.js';
import { Reflections } from '../mongo/reflections.js';

const nonCalc = [{q:0,a:'A'},{q:1,a:'B'},{q:2,a:'C'},{q:3,a:'D'},{q:4,a:'E'},{q:5,a:'A'},{q:6,a:'B'},{q:7,a:'C'},{q:8,a:'A'},{q:9,a:'B'},{q:10,a:'C'},{q:11,a:'D'},{q:12,a:'E'},{q:13,a:'A'},{q:14,a:'B'},{q:15,a:'C'},{q:16,a:'A'},{q:17,a:'B'},{q:18,a:'C'},{q:19,a:'D'},{q:20,a:'E'},{q:21,a:'A'},{q:22,a:'B'},{q:23,a:'C'}],
  calc = [{q:24,a:'A'},{q:25,a:'B'},{q:26,a:'C'},{q:27,a:'D'},{q:28,a:'A'},{q:29,a:'B'},{q:30,a:'C'},{q:31,a:'D'},{q:32,a:'A'},{q:33,a:'B'},{q:34,a:'C'},{q:35,a:'D'}],
	students = {"14946":{"name":"Rothenberg, Matthew Shai"},"16140":{"name":"Herrera, Benjamin Aaron"},"17635":{"name":"Cotler, Daniel Davidsohn"},"18211":{"name":"Zinner, Ruby Elizabeth"},"18238":{"name":"Betheil, Jamie Aliyah"},"18250":{"name":"Fastov, Jacob Aaron"},"18310":{"name":"Pettigrew, William Reed"},"18331":{"name":"Peterson, Lucas Joseph"},"18336":{"name":"Fox, Carolyn Gabrielle"},"18367":{"name":"Holstein, Charli Abigail"},"18380":{"name":"Erhamza, Abigail Lauren"},"18408":{"name":"Getachew, Maya Sebrina"},"18413":{"name":"LaCon, Jeremiah Christian"},"18428":{"name":"Sherbine, Michael William"},"18431":{"name":"Schneiderman, Isabel Antonia"},"18443":{"name":"Farruggia, Ella Pascale"},"18451":{"name":"Molokwu, Stephanie Nneka"},"18468":{"name":"O'Mara, William Daly"},"18516":{"name":"Cummins, Carson Irene"},"18530":{"name":"Joyce, Veronica Emerich"},"18699":{"name":"Ewing, Joshua Miguel"},"18746":{"name":"West, Yajedah Abeo"},"18776":{"name":"Garrison, Hanae Eda"},"19231":{"name":"Friedman-Brown, Daniel Peter"},"19236":{"name":"Friedman-Brown, Adam Thomas"},"19240":{"name":"Wallin, Michael Louis"},"19252":{"name":"Lahey, Patrick Scott"},"19254":{"name":"Trewick, Valerie Alres"},"19266":{"name":"Mantus, Sarah Ursula"},"19285":{"name":"Hom, Matthew John"},"19292":{"name":"Lefferts, Jacob David"},"19313":{"name":"Anthony, Joshua Sessler"},"19322":{"name":"Salvato, Sophia Francesca"},"19325":{"name":"Gillette, Dean Joseph"},"19337":{"name":"Osner, Sylvia Ching-Jen K"},"19338":{"name":"Barboza, Yasmine Aziz"},"19342":{"name":"Wendt, Isabelle Victoria"},"19347":{"name":"Andrasz, Turner William"},"19348":{"name":"Torrey, Anna"},"19357":{"name":"Soles-Torres, Tran Thanh"},"19358":{"name":"Hankey  III, Richard Anthony"},"19364":{"name":"Fagan, Marie Therese"},"19386":{"name":"Braka, Sarah Lily"},"19399":{"name":"Schwartzbard, Nicole Catherine"},"19401":{"name":"Schwartzbard, Lauren Elizabeth"},"19412":{"name":"Yelner, Lauren Nicole"},"19414":{"name":"Holowczak, Christopher David"},"19420":{"name":"Rothstein, Benjamin Jon"},"19422":{"name":"Pryor, Olivia Marie"},"19427":{"name":"Cerny, Caroline Helene"},"19435":{"name":"Bell, John Leland"},"19454":{"name":"Renshaw, Duncan Christopher"},"19473":{"name":"Doubek, Benjamin Joseph"},"19477":{"name":"Donald, Cameron Matthew"},"19487":{"name":"Kret, Jennifer Margaret"},"19488":{"name":"Kret, Lauren Gari"},"19519":{"name":"Cotenoff, Isabelle Blu"},"19529":{"name":"Hajdukiewicz, Timothy James"},"19555":{"name":"Cox, Hanna Xia-Lan"},"19566":{"name":"Fisch, Naomi Claire"},"19573":{"name":"Ribicoff, Gabriel Abraham Herna"},"19649":{"name":"LeBron, Dana Kristen"},"19699":{"name":"Viqueira, Marissa Sophia"},"19713":{"name":"Forman, Sam Alex"},"19948":{"name":"Calder, Cameron Marie"},"20484":{"name":"Langreth, Lars Wickelgren"},"20736":{"name":"Harel, Eden Tayre"},"20842":{"name":"Jaworski, Eleanor Katherine"},"20846":{"name":"McClard, Solian Kim"},"21104":{"name":"Glynn, Alexander Patrick"},"21565":{"name":"Ostrow, Nicole Chan"},"25526":{"name":"Levy, Frances Rebecca"},"27224":{"name":"George, Jarred Matthew"},"50526":{"name":"Antoine, Eloise Marie"},"50578":{"name":"Duvergne, Lorenzo Pierre Leonid"},"51627":{"name":"Ashcraft, Jhamani Anise"},"52398":{"name":"Haile, Joshua Seyoum"},"57400":{"name":"Grayer, Theodore Parker"}};

Meteor.startup(() => {
  // code to run on server at startup
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