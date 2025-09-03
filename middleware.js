 function isLoggedIn(req, res, next) {
  if (req.session.isAuthenticated) {
    return next();
  }
  req.flash("error", "Please login to access this page");
  res.redirect("/login");
}

module.exports = isLoggedIn;