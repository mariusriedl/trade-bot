//var dataFetch = require("./dataFetch");

//const bp = require('body-parser')

const NodeCursor = require("node-cursor");
const cors = require('cors');
const Captcha = require("2captcha");

// express und http Module importieren. Sie sind dazu da, die HTML-Dateien
// aus dem Ordner "public" zu veröffentlichen.
var express = require('express');
const { cursorEvents } = require("node-cursor");
var app = express();
var server = require('http').createServer(app);

const port = 8080;
const root = "/web";
const router = express.Router();

const SteamUser = require('steam-user');
const SteamCommunity = require('steamcommunity');
const SteamTotp = require('steam-totp');
const TradeOfferManager = require('steam-tradeoffer-manager'); // use require('steam-tradeoffer-manager') in production
const FS = require('fs');

let client = new SteamUser();
let manager = new TradeOfferManager({
    "steam": client, // Polling every 30 seconds is fine since we get notifications from Steam
    "domain": "example.com", // Our domain is example.com
    "language": "en" // We want English item descriptions
});
let community = new SteamCommunity();

const corsOptions = {
    origin: '*',
    credentials: true,            //access-control-allow-credentials:true
    optionSuccessStatus: 200,
}


// Steam logon options
let logOnOptions = {
    "accountName": "",
    "password": ""
};

if (FS.existsSync('polldata.json')) {
    manager.pollData = JSON.parse(FS.readFileSync('polldata.json').toString('utf8'));
}

client.logOn(logOnOptions);

client.on('loggedOn', function () {
    console.log("Logged into Steam");
});

client.on('webSession', function (sessionID, cookies) {
    manager.setCookies(cookies, function (err) {
        if (err) {
            console.log(err);
            process.exit(1); // Fatal error since we couldn't get our API key
            return;
        }

        console.log("Got API key: " + manager.apiKey);
    });

    community.setCookies(cookies);
});

manager.on('newOffer', function (offer) {
    console.log("New offer #" + offer.id + " from " + offer.partner.getSteam3RenderedID());
    if (offer.itemsToReceive.length > 0 && offer.itemsToGive.length == 0) {
        offer.accept(function (err, status) {
            if (err) {
                console.log("Unable to accept offer: " + err.message);
            } else {
                console.log("Offer accepted: " + status);
                if (status == "pending") {
                    community.acceptConfirmationForObject("identitySecret", offer.id, function (err) {
                        if (err) {
                            console.log("Can't confirm trade offer: " + err.message);
                        } else {
                            console.log("Trade offer " + offer.id + " confirmed");
                        }
                    });
                }
            }
        });
    } else {
        console.log("Offer not empty");
    }
    /*offer.accept(function (err, status) {
        if (err) {
            console.log("Unable to accept offer: " + err.message);
        } else {
            console.log("Offer accepted: " + status);
            if (status == "pending") {
                community.acceptConfirmationForObject("identitySecret", offer.id, function (err) {
                    if (err) {
                        console.log("Can't confirm trade offer: " + err.message);
                    } else {
                        console.log("Trade offer " + offer.id + " confirmed");
                    }
                });
            }
        }
    });*/
});

manager.on('receivedOfferChanged', function (offer, oldState) {
    console.log(`Offer #${offer.id} changed: ${TradeOfferManager.ETradeOfferState[oldState]} -> ${TradeOfferManager.ETradeOfferState[offer.state]}`);

    if (offer.state == TradeOfferManager.ETradeOfferState.Accepted) {
        offer.getExchangeDetails((err, status, tradeInitTime, receivedItems, sentItems) => {
            if (err) {
                console.log(`Error ${err}`);
                return;
            }

            // Create arrays of just the new assetids using Array.prototype.map and arrow functions
            let newReceivedItems = receivedItems.map(item => item.new_assetid);
            let newSentItems = sentItems.map(item => item.new_assetid);

            console.log(`Received items ${newReceivedItems.join(',')} Sent Items ${newSentItems.join(',')} - status ${TradeOfferManager.ETradeStatus[status]}`)
        })
    }
});

manager.on('pollData', function (pollData) {
    FS.writeFileSync('polldata.json', JSON.stringify(pollData));
});

app.options('*', cors());

app.use(cors(corsOptions));

function mouseClick(x, y) {
    //randomize mouse position
    x += Math.random() * 10 - 5;
    y += Math.random() + 10 - 5;
    NodeCursor.setCursorPosition({
        x: x,
        y: y
    });
    setTimeout(() => {
        NodeCursor.sendCursorEvent({
            event: NodeCursor.cursorEvents.LEFT_DOWN,
            data: 0,
            x: x,
            y: y
        });
        setTimeout(() => {
            NodeCursor.sendCursorEvent({
                event: NodeCursor.cursorEvents.LEFT_UP,
                data: 0,
                x: x,
                y: y
            });
        }, 100);
    }, 100);

}

// Mit diesem Kommando starten wir den Webserver.
server.listen(port, function () {
    // Wir geben einen Hinweis aus, dass der Webserer läuft.
    console.log('Server running on localhost:' + port);
});

// Hier teilen wir express mit, dass die öffentlichen HTML-Dateien
// im Ordner "web" zu finden sind.
app.use(express.static(__dirname + root));

// add router in the Express app.
app.use("/", router);


app.post('/click-captcha', (req, res) => {
    mouseClick(800, 540);
    res.status(200).send('{}');
});

app.post('/click-corner', (req, res) => {
    mouseClick(200, 200);
    res.status(200).send('{}');
});

