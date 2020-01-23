const mongoose = require('mongoose');
// mongoose.Promise = global.Promise;
mongoose.Promise = require('bluebird');
// mongoose.connect('mongodb://localhost:27017/QuikTix', {useNewUrlParser: true});
const db = mongoose.connect('mongodb://localhost:27017/QuikTix', {useNewUrlParser: true, useUnifiedTopology: true});

const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const https = require('https');
const port = 7000;
const app = express();
const cookie = require('cookie-parser');
const bcrypt = require('bcryptjs');
var nodemailer = require('nodemailer');
var randomize = require('randomatic');


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({  extended: true }));
app.set('view engine', 'ejs');
app.use(express.static(path.join(__dirname)));
app.use(express.static(path.join(__dirname, 'images')));

//use cookie for tracking logins
app.use(cookie());



//Create models for mongo db - Start
const Accounts = mongoose.model('Accounts', {
	Name: String,
	Username: {
		type: String,
		unique: true,
		required: true,
		trim: true
	},
	Email: {
		type: String,
		unique: true,
		required: true,
		trim: true
	},
	Password: {
		type: String,
		required: true,
	},
	CCNumber: String,
	CCDate: String,
	CCSec: String,
	Address: String,
	City: String,
	State: String,
	Zip: String,
	Admin: Number,
	Vendor: Number
});

const Events = mongoose.model('Events', {
	Name: String,
	Type: String,
	Classification: String,
	Genre: String,
	Date: String,
	Time: String,
	Venue_Name: String,
	Venue_Address: String,
	Venue_City: String,
	Venue_State: String,
	Venue_Zip: String,
	Event_Image: String,
	Venue_Image: String,
	Seat_Map: String,
	Quantity: Number,
	Price_Min: String,
	Price_Max: String
});

const Cart = mongoose.model('Cart', {
	Username: String,
	ticketID: String
});

/*Paths*/
app.get('/', function(req, res) {
	try {
		res.render(`index`, {'Settings':{'Username':`${getName(req)}`}});
	} catch (error) {
		console.log("Caught Error in /: " + error);
	}
});

app.get('/sign_up', function(req, res) {
	try {
		res.render(`sign_up`, {
			'Settings': {
				'Username':``,
				'Email':``,
				'Password':``,
				'CCNumber': ``,
				'CCDate': ``,
				'CCSec': ``,
				'Address': ``,
				'City': ``,
				'State': ``,
				'Zip': ``,
				'Error': {
					message: ""
				}
			}
		});
	} catch (error) {
		console.log("Caught Error in /sign_up");
	}
});

app.post('/sign_up', async function(req, res) {
	try {
		console.log("IN SIGN_UP POST");
		console.log(req.body);

		var user = await Accounts.findOne({ Username: req.body.Username }).exec();
		if(!user) {
			var salt = bcrypt.genSaltSync(10);
			req.body.Password = bcrypt.hashSync(req.body.Password, salt);
			req.body.CCNumber = bcrypt.hashSync(req.body.CCNumber, salt);
			var user = new Accounts(req.body);

			var result = await user.save();
			res.redirect('/');
		} else {
			console.log("Exists");
			res.clearCookie("Username");
			res.render(`sign_up`, {
				'Settings': {
					'Username':`${req.body.Username}`,
					'Email':`${req.body.Email}`,
					'Password':`${req.body.Password}`,
					'CCNumber': `${req.body.CCNumber}`,
					'CCDate': `${req.body.CCDate}`,
					'CCSec': `${req.body.CCSec}`,
					'Address': `${req.body.Address}`,
					'City': `${req.body.City}`,
					'State': `${req.body.State}`,
					'Zip': `${req.body.Zip}`,
					'Error': {
						message: "Username or Email Already Exists"
					}
				}
			});
		}






		// res.render(`sign_up`)
	} catch (error) {
		console.log("Caught Error in /sign_up:" + error);
	}
});

app.get('/login', function(req, res) {
	try {
		res.render(`login`, {'Settings': {'Username':`${getName(req)}`, "Error": "", "Username": ""}});
	} catch (error) {
		console.log("Caught Error in /login");
	}
});

app.post('/login', async function(req, res) {
	try {
			var user = await Accounts.findOne({ Username: req.body.Username }).exec();
			if(!user) {
				return res.render(`login`, {'Settings': {'Username':`${getName(req)}`, "Error": "That Username or Password invalid", "Username": req.body.Username}});
			}
			if(!bcrypt.compareSync(req.body.Password, user.Password)) {
				return res.render(`login`, {'Settings': {'Username':`${getName(req)}`, "Error": "That Username or Password invalid", "Username": req.body.Username}});
			}
			res.cookie("Username", user.Username, {maxAge: 7000000});
			res.redirect(`/`)
			// res.send({ message: "The username and password combination is correct!" });
		} catch (error) {
				res.status(500).send(error);
		}
	// try {
	//   console.log("IN LOGIN POST");
	//   console.log(req.body);
	//   // res.render(`sign_up`)
	// } catch (error) {
	//   console.log("Caught Error in /login:" + error);
	// }

});

app.get('/sports', function(req, res) {
	try {
		res.render(`sports`, {'Settings' : {'Events': "", 'Username':`${getName(req)}`, 'Event': ``, 'Date': ``}});
	} catch (error) {
		console.log("Caught Error in /sports" + error);
	}
});

app.post('/sports', function(req, res) {
	try {
		console.log("IN Sports POST");
		console.log(req.body);
		var sport = req.body.sportSelect;
		var date = req.body.sportDate;
		if (sport == "All Sports" && date == "") {
			Events.find({Classification:"Sports", Date: { $gte : `${getTodaysDate()}`}}, null, {sort: {Date: 1}}, (error, sports) => {
				if (error) return next(error);
				res.render(`sports`, {'Settings' : {'Events': sports, 'Username':`${getName(req)}`, 'Event': `${sport}`, 'Date': `${date}`}});
			});
		} else if (sport == "All Sports" && date != "") {
			Events.find({Classification:"Sports", Date: date}, null, {sort: {Date: 1}}, (error, sports) => {
				if (error) return next(error);
				res.render(`sports`, {'Settings' : {'Events': sports, 'Username':`${getName(req)}`, 'Event': `${sport}`, 'Date': `${date}`}});
			});
		} else if (sport != "" && date == "") {
			Events.find({Classification:"Sports", Genre: sport, Date: { $gte : `${getTodaysDate()}`}}, null, {sort: {Date: 1}}, (error, sports) => {
				if (error) return next(error);
				res.render(`sports`, {'Settings' : {'Events': sports, 'Username':`${getName(req)}`, 'Event': `${sport}`, 'Date': `${date}`}});
			});
		} else {
			Events.find({Classification:"Sports", Genre: sport, Date: date}, null, {sort: {Date: 1}}, (error, sports) => {
				// if (error) return next(error);
				if(error) {
					console.log("EEEEEKLLKJ: " + error);
				}
				res.render(`sports`, {'Settings' : {'Events': sports, 'Username':`${getName(req)}`, 'Event': `${sport}`, 'Date': `${date}`}});
			});
		}
	} catch (error) {
		console.log("Caught Error in /sports:" + error);
	}
});

app.get('/concerts', function(req, res) {
	try {
			res.render(`concerts`, {'Settings' : {'Events': "", 'Username':`${getName(req)}`, 'Event': ``, 'Date': ``}});
	} catch (error) {
		console.log("Caught Error in /concerts");
	}
});

app.post('/concerts', function(req, res) {
	try {
		console.log("IN Concerts POST");
		console.log(req.body);
		var concert = req.body.concertSelect;
		var date = req.body.concertDate;
		if (concert == "All Genres" && date == "") {
			Events.find({Classification:"Music", Date: { $gte : `${getTodaysDate()}`}}, null, {sort: {Date: 1}}, (error, concerts) => {
				if (error) return next(error);
				res.render(`concerts`, {'Settings' : {'Events': concerts, 'Username':`${getName(req)}`, 'Event': `${concert}`, 'Date': `${date}`}});
			});
		} else if (concert == "All Genres" && date != "") {
			Events.find({Classification:"Music", Date: date}, null, {sort: {Date: 1}}, (error, concerts) => {
				if (error) return next(error);
				res.render(`concerts`, {'Settings' : {'Events': concerts, 'Username':`${getName(req)}`, 'Event': `${concert}`, 'Date': `${date}`}});
			});
		} else if (concert != "" && date == "") {
			Events.find({Classification:"Music", Genre: concert, Date: { $gte : `${getTodaysDate()}`}}, null, {sort: {Date: 1}}, (error, concerts) => {
				if (error) return next(error);
				res.render(`concerts`, {'Settings' : {'Events': concerts, 'Username':`${getName(req)}`, 'Event': `${concert}`, 'Date': `${date}`}});
			});
		} else {
			Events.find({Classification:"Music", Genre: concert, Date: date}, null, {sort: {Date: 1}}, (error, concerts) => {
				// if (error) return next(error);
				if(error) {
					console.log("EEEEEKLLKJ: " + error);
				}
				res.render(`concerts`, {'Settings' : {'Events': concerts, 'Username':`${getName(req)}`, 'Event': `${concert}`, 'Date': `${date}`}});
			});
		}
	} catch (error) {
		console.log("Caught Error in /concerts:" + error);
	}
});

app.get('/art_theater', function(req, res) {
	try {
		res.render(`art_theater`, {'Settings' : {'Events': "", 'Username':`${getName(req)}`, 'Event': ``, 'Date': ``}});
	} catch (error) {
		console.log("Caught Error in /art_theater");
	}
});

app.post('/art_theater', function(req, res) {
	try {
		console.log("IN art_theaters POST");
		console.log(req.body);
		var art_theater = req.body.art_theaterSelect;
		var date = req.body.art_theaterDate;
		if (art_theater == "All Theater Events" && date == "") {
			Events.find({Classification:"Arts & Theatre", Date: { $gte : `${getTodaysDate()}`}}, null, {sort: {Date: 1}}, (error, art_theaters) => {
				if (error) return next(error);
				res.render(`art_theater`, {'Settings' : {'Events': art_theaters, 'Username':`${getName(req)}`, 'Event': `${art_theater}`, 'Date': `${date}`}});
			});
		} else if (art_theater == "All Theater Events" && date != "") {
			Events.find({Classification:"Arts & Theatre", Date: date}, null, {sort: {Date: 1}}, (error, art_theaters) => {
				if (error) return next(error);
				res.render(`art_theater`, {'Settings' : {'Events': art_theaters, 'Username':`${getName(req)}`, 'Event': `${art_theater}`, 'Date': `${date}`}});
			});
		} else if (art_theater != "" && date == "") {
			Events.find({Classification:"Arts & Theatre", Genre: art_theater, Date: { $gte : `${getTodaysDate()}`}}, null, {sort: {Date: 1}}, (error, art_theaters) => {
				if (error) return next(error);
				res.render(`art_theater`, {'Settings' : {'Events': art_theaters, 'Username':`${getName(req)}`, 'Event': `${art_theater}`, 'Date': `${date}`}});
			});
		} else {
			Events.find({Classification:"Arts & Theatre", Genre: art_theater, Date: date}, null, {sort: {Date: 1}}, (error, art_theaters) => {
				// if (error) return next(error);
				if(error) {
					console.log("EEEEEKLLKJ: " + error);
				}
				res.render(`art_theater`, {'Settings' : {'Events': art_theater, 'Username':`${getName(req)}`, 'Event': `${art_theater}`, 'Date': `${date}`}});
			});
		}
	} catch (error) {
		console.log("Caught Error in /art_theater:" + error);
	}
});

app.post('/addToCart', function(req, res) {
	try {
		var fullurl = req.header('Referer') || '/';
		var url = fullurl.split("/")[2];
		saveCart(getName(req), req.body.ticketID);
		res.redirect(url);
	} catch (error) {
		console.log("Caught Error in /addToCart" + error);
	}
});

app.get('/logout', function(req, res) {
	try {
		res.clearCookie("Username");
		res.redirect('/')
	} catch (error) {
		console.log("Caught Error in /addToCart" + error);
	}
});

app.get('/cart', function(req, res) {
	try {
		var tickets = [];
		console.log("in cart");
		Cart.find({Username:`${getName(req)}`}, null, {sort: {Date: 1}}).then(function(cartItems) {
			cartItems.forEach(function(ticket) {
				tickets.push(Events.find({_id: ticket.ticketID}));
			});
			return Promise.all(tickets);
		}).then(function(tickets){

			res.render(`cart`, {'Settings' : {'Events': JSON.stringify(tickets), 'Username':`${getName(req)}`}});
		}).catch(function(error) {
			console.log("EEEEEEEEEEEEEEEEERRRRRRRRRRRRRRRROOOOOOOOOOOOOORRRRRRRRRRRRRRR: " + error);
		});

	} catch (error) {
		console.log("Caught Error in /cart" + error);
	}
});

app.post('/removeTicket', function(req, res) {
	try {
		var fullurl = req.header('Referer') || '/';
		var url = fullurl.split("/")[2];
		Cart.find({ticketID: req.body.ticketID}).remove().exec();
		res.redirect("/cart");
	} catch (error) {
		console.log("Caught Error in /removeTicket" + error);
	}
});

app.post('/checkout', function(req, res) {
	try {
		var tickets = [];
		console.log("in checkout");
		var fullurl = req.header('Referer') || '/';
		var url = fullurl.split("/")[2];
		var confirm = randomize('Aa0', 10);
		var qtys = req.body.qty
		console.log(qtys);
		Cart.find({Username:`${getName(req)}`}, null, {sort: {Date: 1}}).then(function(cartItems) {
			cartItems.forEach(function(ticket) {
				tickets.push(Events.find({_id: ticket.ticketID}));
			});
			return Promise.all(tickets);
		}).then(function(tickets){
			res.render(`checkout`, {'Settings' : {'Events': JSON.stringify(tickets), 'Qty': JSON.stringify(qtys), 'Confirm': confirm, 'Username':`${getName(req)}`}});
			Accounts.find({Username:`${getName(req)}`}, null).then(function(user) {
			email(user[0].Email, tickets, qtys, confirm);
			Cart.find({Username:`${getName(req)}`}).remove().exec();
			})
		}).catch(function(error) {
			console.log("EEEEEEEEEEEEEEEEERRRRRRRRRRRRRRRROO: " + error);
		});
	} catch (error) {
		console.log("Caught Error in /checkout" + error);
	}
});


app.post('/details', function(req, res) {
	try {
		console.log(req.body);
		Events.find({_id: req.body.ticketID}, (error, event_det) => {
			// if (error) return next(error);
			if(error) {
				console.log("EEEEEKLLKJ: " + error);
			}
			console.log(event_det);
			res.render(`details`, {'Settings' : {'Event': event_det, 'Username':`${getName(req)}`}});
		});
	} catch (error) {
		console.log("Caught Error in /addToCart" + error);
	}
});


function saveCart(name, ticketID) {
	let newCart = new Cart({
		Username: name,
		ticketID: ticketID
	});
	newCart.save((error, results) => {
		if (error) {
			console.log("ERRRRRRRRORRRRRRR");
			res.render('sign_up');
		}
	});
}
// FOR LOADING TABLES - START

// // getEvents();
// populateTable();
// //
// // //Get Events from https://app.ticketmaster.com/discovery/v2/events?apikey=eCt3FnLGTxvqFbyQbTAgOog6EaAKn1ES&locale=*&startDateTime=2019-10-23T09:59:00Z&endDateTime=2020-03-31T09:59:00Z&page=1&stateCode=MN
// function getEvents() {
//   var options = {
//     host: 'app.ticketmaster.com',
//     port: 80,
//     path: '/discovery/v2/events?apikey=eCt3FnLGTxvqFbyQbTAgOog6EaAKn1ES',
//     method: 'POST'
//   };
//
//   // for (var x = 0; x < 5; x++) {
//     var body = "";
//     var url = "https://app.ticketmaster.com/discovery/v2/events?apikey=eCt3FnLGTxvqFbyQbTAgOog6EaAKn1ES&locale=*&startDateTime=2019-10-23T09:59:00Z&endDateTime=2020-03-31T09:59:00Z&size=20&page=" + 0 + "&stateCode=MN";
//     console.log(url);
//     var req = https.request(url, function(res) {
//       console.log('STATUS: ' + res.statusCode);
//       console.log('HEADERS: ' + JSON.stringify(res.headers));
//       res.setEncoding('utf8');
//       res.on('data', function(chunk) {
//         body += chunk;
//         // console.log('BODY: ' + chunk);
//         console.log(body);
//         fs.writeFile(__dirname + '/events.json', chunk, function(err){
//           if (err) {
//             console.log("error");
//           }
//         });
//
//
//       });
//       console.log("");
//     });
//
//     console.log("here");
//
//     req.on('error', function(e) {
//       console.log('problem with request: ' + e.message);
//     });
//
//     // write data to request body
//     req.write('data\n');
//     req.write('data\n');
//     req.end();
//   // }
//
// }
//
//
//
// function populateTable() {
//   var obj = JSON.parse(fs.readFileSync(__dirname +'/events.json', 'utf8'));
//   var name = "", type = ""; classification = "", genre = "", date = "", time = "", venue_name = "", venue_address = "",
//     venue_city = "", venue_state = "", venue_zip = "", event_image = "", venue_image = "", seat_map = "", quantity = "", price_min = "", price_max = "";
//   for (var i = 0; i < obj._embedded.events.length; i++) {
//     name = obj._embedded.events[i].name;
//     console.log(name);
//     type = obj._embedded.events[i].type;
//     console.log(type);
//     classification = obj._embedded.events[i].classifications[0].segment.name;
//     console.log(classification);
//     if (obj._embedded.events[i].classifications[0].genre !== undefined) {
//       genre = obj._embedded.events[i].classifications[0].genre.name;
//     } else {
//       genre = null;
//     }
//
//     console.log(genre);
//     date = obj._embedded.events[i].dates.start.localDate;
//     console.log(date);
//     time = obj._embedded.events[i].dates.start.localTime;
//     console.log(time);
//     venue_name = obj._embedded.events[i]._embedded.venues[0].name;
//     console.log(venue_name);
//     venue_address = obj._embedded.events[i]._embedded.venues[0].address.line1;
//     venue_city = obj._embedded.events[i]._embedded.venues[0].city.name;
//     venue_state = obj._embedded.events[i]._embedded.venues[0].state.name;
//     venue_zip = obj._embedded.events[i]._embedded.venues[0].postalCode;
//     console.log(venue_address);
//     console.log(venue_city);
//     console.log(venue_state);
//     console.log(venue_zip);
//     event_image = obj._embedded.events[i].images[0].url;
//     console.log(event_image);
//     if (obj._embedded.events[i]._embedded.venues[0].images !== undefined && obj._embedded.events[i]._embedded.venues[0].images[0] !== undefined) {
//       venue_image = obj._embedded.events[i]._embedded.venues[0].images[0].url;
//     } else {
//       venue_image = null;
//     }
//     console.log(venue_image);
//     if (obj._embedded.events[i].seatmap !== undefined) {
//       seatmap = obj._embedded.events[i].seatmap.staticUrl;
//     } else {
//       seatmap = null;
//     }
//     console.log(seatmap);
//     quantity = Math.floor(Math.random() * 1000) + 1000;
//     console.log(quantity);
//     if (obj._embedded.events[i].priceRanges !== undefined) {
//       price_min = obj._embedded.events[i].priceRanges[0].min;
//       price_max = obj._embedded.events[i].priceRanges[0].max;
//     } else {
//       price_min = null;
//       price_max = null;
//     }
//
//     console.log(price_min);
//     console.log(price_max);
//     console.log("++++++++++++++++++++++++++++++++++++++");
//
//     let newEvent = new Events ({
//       Name: name,
//       Type: type,
//       Classification: classification,
//       Genre: genre,
//       Date: date,
//       Time: time,
//       Venue_Name: venue_name,
//       Venue_Address: venue_address,
//       Venue_City: venue_city,
//       Venue_State: venue_state,
//       Venue_Zip: venue_zip,
//       Event_Image: event_image,
//       Venue_Image: venue_image,
//       Seat_Map: seatmap,
//       Quantity: quantity,
//       Price_Min: price_min,
//       Price_Max: price_max
//     });
//
//     newEvent.save((error, results) => {
//       if (error) {
//         console.log("ERRRRRRRRORRRRRRR");
//         // res.render('sign_up');
//       } else {
//         // res.redirect('/');
//       }
//     });
//   }
// }
// FOR LOADING TABLES - END



function getName (req) {
	var name;
	if (req.cookies.Username === undefined) {
		name = "";
	} else {
		name = req.cookies.Username;
	}
	return name;
}

function getTodaysDate() {
	var date_ob = new Date();
	var date = ("0" + date_ob.getDate()).slice(-2);
	var month = ("0" + (date_ob.getMonth() + 1)).slice(-2);
	var year = date_ob.getFullYear();

	// prints date in YYYY-MM-DD format
	return year + "-" + month + "-" + date;

}

// email();

function email(user_email, tickets, qty, confirm) {
	var transporter = nodemailer.createTransport({
		service: 'gmail',
		auth: {
			user: 'quik.tix.no.reply@gmail.com',
			pass: 'tickets123'
		}
	});


	var ticket_html = `<div class="container col-sm-12 text-center"><h3>Here is your Confirmation number: <b>${confirm}</b></h3></div><br><div class="container offset-sm-1 col-sm-12"><div class="table-responsive table-bordered"><table style="width: 100%" class="table table-striped"><thead><tr><th>Name</th><th>Date</th><th>Time</th><th>Venue Name</th><th>Qty</th><th>Price</th><tr></thead><tbody>`;
	var price = 0, total = 0;
	for (var x = 0; x < tickets.length; x++) {
		price = ((Number(tickets[x][0].Price_Max) + Number(tickets[x][0].Price_Min))/2) * Number(qty[x][0]);
		total += price;
		ticket_html += `<tr><td>${tickets[x][0].Name}</td><td>${tickets[x][0].Date}</td><td>${tickets[x][0].Time}</td><td>${tickets[x][0].Venue_Name}</td><td>${qty[x][0]}</td><td>${price.toFixed(2)}</td></tr>`
	}
	ticket_html += `<tr><td><b>TOTAL</b></td><td></td><td></td><td></td><td></td><td><b>${total.toFixed(2)}</b></td></tr></tbody></table></div></div>`;

	var mailOptions = {
		from: 'quik.tix.no.reply@gmail.com',
		to: user_email,
		subject: 'Quik Tix Purchase - Confirmation: ' + confirm,
		html: ticket_html
	};

	transporter.sendMail(mailOptions, function(error, info){
		if (error) {
			console.log(error);
		} else {
			console.log('Email sent: ' + info.response);
		}
	});
}

console.log(`listening at 'localhost:${port}'`);
app.listen(port);
