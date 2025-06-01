var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const exphbs = require('express-handlebars');
var userRouter = require('./routes/user');
var adminRouter = require('./routes/admin');
var fileUpload = require('express-fileupload');
var app = express();
const { connectDB } = require('./config/connection'); // connection file with hardcoded URI
var session = require('express-session');
const multer = require('multer');

// Handlebars setup
const hbs = exphbs.create({
  extname: 'hbs',
  defaultLayout: 'layout',
  layoutsDir: path.join(__dirname, 'views/layout/'),
  partialsDir: path.join(__dirname, 'views/partials/'),
  runtimeOptions: {
    allowProtoPropertiesByDefault: true,
    allowProtoMethodsByDefault: true
  },
  helpers: {
    multiply: (a, b) => a * b,
    totalPrice: (cartItems) => {
      let total = 0;
      for (const item of cartItems) {
        if (item.product && item.product.price) {
          total += item.quantity * item.product.price;
        }
      }
      return total;
    },
    formatDate: function (date) {
      if (!date) return '';
      return new Date(date).toLocaleString('en-IN', {
        dateStyle: 'medium',
        timeStyle: 'short'
      });
    },
    encodeURI: function (location) {
      return encodeURIComponent(location);
    }
  }
});
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

// Middlewares
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload());

app.use(
  session({
    secret: 'key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 600000000 }
  })
);

// Connect to MongoDB Atlas & start server
connectDB()
  .then(() => {
    const port = 7000; // hardcoded port, or you can use environment if you want
    app.listen(port, () => {
      console.log(`🚀 Server running at http://localhost:${port}`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to start the server:', err);
  });

// Routes
app.use('/', userRouter);
app.use('/admin', adminRouter);

// 404 handler with route logging
app.use(function (req, res, next) {
  console.log('🚨 404 error caught: Requested URL not found:', req.originalUrl);
  next(createError(404));
});

// Error handler
app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  res.status(err.status || 500);
  res.render('error');
});

// Debug session logging for /admin routes
app.use('/admin', (req, res, next) => {
  if (req.session) {
    console.log('📝 Current session:', req.session);
  }
  next();
});

module.exports = app;
