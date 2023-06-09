//Start DECLARATIONS AND PACKAGAES ===============================================================================

require("dotenv").config();

var mysql = require("mysql");
var connection = mysql.createConnection({
  host: process.env.MYSQL_HOST,
  user: process.env.MYSQL_USER,
  password: process.env.MYSQL_PASS,
  database: process.env.MYSQL_DB,
});

var express = require("express"); //install express
var app = express();
const port = 3000;
app.set("view engine", "ejs");
app.use(express.static(__dirname + "/public"));
app.use(express.static("./scripts"));
app.use(express.static("./images"));

var session = require("express-session"); //install express-session
app.use(
  session({
    secret: "secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      //maxAge: 10 * 1000 //* 60 * 4 //number (in milliseconds) to use when calculating the Expires
      maxAge: null,
    },
  })
);

var bodyParser = require("body-parser"); //install body-parser to get the needed data to pass into a post request.
app.use(bodyParser.urlencoded({ extended: true }));

app.use(function (req, res, next) {
  res.setHeader(
    "Cache-Control",
    "no-cache, private, no-store, must-revalidate, max-stale=0, post-check=0, pre-check=0"
  );
  next();
});

//End DECLARATIONS AND PACKAGAES ===============================================================================

// Initialize =====================================================
var v_sessionUsr = {};
// End Initializations ==============================

// Start Sizing ================================================================================================
app.get("/", function (req, res) {
  let v_sessionUsr = req.session.user;
  // If the user has already logged in, then redirect to installer dashboard.
  if (v_sessionUsr) {
    res.redirect("/solarSize");
  } else {
    res.render("home", {
      loginOK: req.session.loginOK,
      errors: req.session.errors,
    });
  }
});

//Size Solar PV System
app.get("/solarSize", function (req, res) {
  let v_sessionUsr = req.session.user;

  res.render("solarSize", {});
});

app.post("/createClient", function (req, res) {
  let v_sessionUsr = req.session.user;
  var clientFirstName = req.body.clientFirstName;
  var clientLastName = req.body.clientLastName;
  var clientNumber = req.body.clientNumber;
  var clientCity = req.body.clientCity;
  var clientMethod = req.body.clientMethod;
  req.session.clientMethod = clientMethod;

  if (v_sessionUsr) {
    //Insert client details to the database.
    var q =
      "INSERT INTO clients (firstname, lastname, mobilenum, location_city, sizing_method) VALUES (?,?,?,?,?)";
    connection.query(
      q,
      [clientFirstName, clientLastName, clientNumber, clientCity, clientMethod],
      function (error, results) {
        if (error) throw error;
      }
    );

    var q1 =
      "SELECT * from clients where firstname = ? AND lastname = ? AND mobilenum = ? AND location_city = ?";
    connection.query(
      q1,
      [clientFirstName, clientLastName, clientNumber, clientCity],
      function (error, results, fields) {
        if (error) throw error;

        if (results[0] == null) {
          req.session.errors = "NO CLIENT WAS CREATED.";
          req.session.wasClientCreated = false;
        } else {
          req.session.clientDetails = results;
          req.session.clientID = results[0].clientID;
          req.session.wasClientCreated = true;
        }
        req.session.wereInvertersFetch = false;

        if (req.session.clientDetails[0].sizing_method == "monthly bill") {
          res.render("sizingDetailsByBill", {
            errors: req.session.errors,
            wasClientCreated: req.session.wasClientCreated,
            wereInvertersFetch: req.session.wereInvertersFetch,
            clientDetails: req.session.clientDetails,
          });
        } else if (
          req.session.clientDetails[0].sizing_method == "appliances list"
        ) {
          res.render("sizingDetailsByAppliance", {
            errors: req.session.errors,
            wasClientCreated: req.session.wasClientCreated,
            wereInvertersFetch: req.session.wereInvertersFetch,
            clientDetails: req.session.clientDetails,
          });
        } else if (
          req.session.clientDetails[0].sizing_method == "known power kW" ||
          req.session.clientDetails[0].sizing_method == "other methods"
        ) {
          res.render("sizingDetailsByKW", {
            errors: req.session.errors,
            wasClientCreated: req.session.wasClientCreated,
            wereInvertersFetch: req.session.wereInvertersFetch,
            clientDetails: req.session.clientDetails,
          });
        }
      }
    );
  } else {
    res.redirect("/");
  }
});

app.post("/suggestInverterByBill", function (req, res) {
  let v_sessionUsr = req.session.user;
  var monthlyBill = req.body.monthlyBill;
  var currentPhase = req.body.currentPhase;
  var clientID = req.session.clientID;
  var clientMethod = req.session.clientMethod;

  if (v_sessionUsr) {
    estimatedPower = Math.round(monthlyBill / 1000) * 1000;
    var q =
      "INSERT INTO clientPowerSizings (clientID, load_type, load_watts, output_phase) VALUES (?,?,?,?)";
    connection.query(
      q,
      [clientID, clientMethod, estimatedPower, currentPhase],
      function (error, results) {
        if (error) throw error;
      }
    );

    var q1 =
      "SELECT * from clientPowerSizings where clientID = ? AND load_watts = ?";
    connection.query(
      q1,
      [clientID, estimatedPower],
      function (error, results, fields) {
        if (error) throw error;
        req.session.powerSizing = results;

        var q2 = "SELECT * from inverters";
        connection.query(q2, function (error, results, fields) {
          if (error) throw error;
          req.session.inverters = results;

          var q3 = "SELECT * from solarpanels";
          connection.query(q3, function (error, results, fields) {
            if (error) throw error;
            req.session.solarpanels = results;

            var q4 = "SELECT * from batteries";
            connection.query(q4, function (error, results, fields) {
              if (error) throw error;
              req.session.batteries = results;

              req.session.wereInvertersFetch = true;

              res.render("sizingByBillInverter", {
                errors: req.session.errors,
                wasClientCreated: req.session.wasClientCreated,
                wereInvertersFetch: req.session.wereInvertersFetch,
                clientDetails: req.session.clientDetails,
                powerSizing: req.session.powerSizing,
                inverters: req.session.inverters,
                solarpanels: req.session.solarpanels,
                batteries: req.session.batteries,
              });
            });
          });
        });
      }
    );
  } else {
    res.redirect("/");
  }
});

app.post("/sizingByBillPanel", function (req, res) {
  let v_sessionUsr = req.session.user;
  var inverterOption = req.body.inverterOption;
  var inverterOptionPcs = req.body.inverterOptionPcs;
  var calculatedInvPower = req.body.calculatedInvPower;

  var panelOption = req.body.panelOption;
  var panelOptionPcs = req.body.panelOptionPcs;
  var calculatedSolarPower = req.body.calculatedSolarPower;

  var batteryOption = req.body.batteryOption;
  var batteryOptionPcs = req.body.batteryOptionPcs;
  var calculatedBattEnergy = req.body.calculatedBattEnergy;

  if (v_sessionUsr) {
    var q =
      "INSERT INTO clientPowerSizings (system_supply_watts, recommended_inverter, pcs_of_inverter, recommended_battery, pcs_of_battery, recommended_panel, pcs_of_panel) VALUES (?,?,?,?,?,?,?)";
    connection.query(
      q,
      [
        calculatedInvPower,
        inverterOption,
        inverterOptionPcs,
        batteryOption,
        batteryOptionPcs,
        panelOption,
        panelOptionPcs,
      ],
      function (error, results) {
        if (error) throw error;
      }
    );
  } else {
    res.redirect("/");
  }
});

app.get("/logout", (req, res, next) => {
  var v_sessionUsr = {};
  // Check if the session exist
  if (req.session.user) {
    // destroy the session and redirect the user to the index page.
    req.session.destroy(function () {
      res.redirect("/");
    });
  }
});
// End Access ================================================================================================

// Errors => page not found 404
app.use((req, res, next) => {
  var err = new Error("Page not found");
  err.status = 404;
  next(err);
});

// Handling errors (send them to the client)
app.use((err, req, res, next) => {
  res.status(err.status || 500);
  res.send(err.message);
});

app.listen(port, function () {
  console.log("Server listening on port " + port);
});
