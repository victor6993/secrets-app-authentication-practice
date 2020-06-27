require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const app = express();
const mongoose = require("mongoose");
const port = process.env.PORT || 3000;

// google Oauth2
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require("mongoose-findorcreate");

// coockies and sessions
const session = require("express-session");
const passport = require("passport");
// no hace falta require passport-local porque es una dependencia de passport-local-mongoose
const passportLocalMongoose = require("passport-local-mongoose");

app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");
app.use(express.static("public"));

// coockies and sessions
app.use(session({
  secret: "Our little secret.",
  resave: false,
  saveUninitialized: false
}));

// coockies and sessions
app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/userDB", { useNewUrlParser: true, useUnifiedTopology: true }, (err)=> {
  if(!err) {
    console.log("Successfully started mongoDB");
  }
});
mongoose.set("useCreateIndex", true);

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  secret: String
});

// coockies and sessions
userSchema.plugin(passportLocalMongoose);

// google Oauth2
userSchema.plugin(findOrCreate);

const User = new mongoose.model("user", userSchema);

passport.use(User.createStrategy());

// google Oauth2
passport.serializeUser(function(user, done) {
  done(null, user.id);
});
// google Oauth2
passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/secrets"
},
function(accessToken, refreshToken, profile, cb) {
  User.findOrCreate({ googleId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));


app.get("/", (req, res)=> {
  res.render("home");
});

// google Oauth2
app.get('/auth/google',
passport.authenticate('google', { scope: ['profile'] }));

// google Oauth2
app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect secrets.
    res.redirect('/secrets');
  });

app.get("/login", (req, res)=> {
  res.render("login");
});

app.get("/register", (req, res)=> {
  res.render("register");
});

app.get("/submit", (req, res)=> {
  if(req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.post("/submit", (req, res)=> {
  const submittedSecret = req.body.secret;

  User.findById(req.user.id, (err, foundUser)=> {
    if(err) {
      console.log(err);
    } else {
      if(foundUser) {
        foundUser.secret = submittedSecret;
        foundUser.save(()=> {
          res.redirect("/secrets");
        });
      }
    }
  })

});

app.get("/logout", (req, res)=> {
  req.logout();
  res.redirect("/");
});


// coockies and sessions
app.get("/secrets", (req, res) => {
  User.find({"secret": {$ne: null}}, (err, foundUsers)=> {    // $ne -> not equals to //
    if(err) {
      console.log(err);
    } else {
      if(foundUsers) {
        res.render("secrets", {usersWithSecrets: foundUsers});
      }
    }
  });   
});

// coockies and sessions
app.post("/register", (req, res)=> {

  User.register({username: req.body.username}, req.body.password, (err, user)=> {
    if(err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, ()=> {
        res.redirect("/secrets");
      })
    }
  })
});

// coockies and sessions
app.post("/login", (req, res)=> {
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });
  
  req.login(user, (err)=> {
    if(err) {
      console.log(err);
    } else {
      passport.authenticate("local")(req, res, ()=> {
      res.redirect("/secrets");
      });
    }
  });

});

app.listen(port, ()=> {
  console.log("The server has started on port "+port);
});

//? Lv 1 - texto tal cual

//? Lv 2 - clave de encriptacion mongoose
// const encrypt = require("mongoose-encryption");
// userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ["password"]});

//? Lv 3 - Encriptacion Hash md5
// const md5 = require("md5");
// app.post("/register", (req, res)=> {
//   const newUser = new User({
//     email: req.body.username,
//     password: md5(req.body.password)
//   });

// app.post("/login", (req, res)=> {
//   const username = req.body.username;
//   const password = md5(req.body.password);
//   User.findOne({email: username}, (err, foundUser)=> {
//     if(!err) {
//       if(foundUser) {
//           if(foundUser.password === password) res.render("secrets");
//       }
//     }
//   });
// });

//? Lv 4 - bcrypt hash
// const bcrypt = require("bcrypt");
// const saltRounds = 10;

// app.post("/register", (req, res)=> {
//   bcrypt.hash(req.body.password, saltRounds, (err, hash)=> {
//     const newUser = new User({
//       email: req.body.username,
//       password: hash
//     });
  
//     newUser.save((err)=> {
//       if(!err) {
//         res.render("secrets");
//       }
//     });
//   });
  
// });

// app.post("/login", (req, res)=> {

//   const username = req.body.username;
//   const password = req.body.password;

//   User.findOne({email: username}, (err, foundUser)=> {
//     if(!err) {
//       if(foundUser) {
//         bcrypt.compare(password, foundUser.password, (err, result)=> {
//           if(result) {
//             res.render("secrets");
//           }
//         });
//       }
//     }
//   });
// });

//? Lv 5 - Coockies & sessions
// const session = require("express-session");
// const passport = require("passport");
// no hace falta require passport-local porque es una dependencia de passport-local-mongoose
// const passportLocalMongoose = require("passport-local-mongoose");

// app.use(session({
//   secret: "Our little secret.",
//   resave: false,
//   saveUninitialized: false
// }));

// app.use(passport.initialize());
// app.use(passport.session());

// userSchema.plugin(passportLocalMongoose)

// passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

// app.get("/secrets", (req, res) => {
//   if(req.isAuthenticated()) {
//     res.render("secrets");
//   } else {
//     res.redirect("/login");
//   }
// });

// app.post("/register", (req, res)=> {

//   User.register({username: req.body.username}, req.body.password, (err, user)=> {
//     if(err) {
//       console.log(err);
//       res.redirect("/register");
//     } else {
//       passport.authenticate("local")(req, res, ()=> {
//         res.redirect("/secrets");
//       })
//     }
//   })
// });

// app.post("/login", (req, res)=> {
//   const user = new User({
//     username: req.body.username,
//     password: req.body.password
//   });

//   req.login(user, (err)=> {
//     if(err) {
//       console.log(err);
//       res.redirect("/login");
//     } else {
//       passport.authenticate("local")(req, res, ()=> {
//       res.redirect("/secrets");
//       });
//     }
//   });
// });


//? Lv 6 - 