var authservice = (function() {

  var LOGIN_DETAILS_COOKIE_NAME = 'authservice-login-details';
  var LOGIN_TIMEOUT_DAYS = 3;
  var ENDPOINT = null;

  // Currently logged in user
  var _currentEntityId = -1; // Separate, so user code can't hack it
  var _currentUser = null;

  // Current Access token
  var _ttuat = null;

  // Maybe use Angular's $http object for AJAX calls.
  var _$http = null;


  // Are we simulating?
  var _pretend = false;

  // User callbacks
  var _onUserChange = null;


  var dummyUserBob =  {
    "tenant": "nodeclient",
    "id": 904,
    "authority": "email",
    "type": "user",
    "external_id": "jim",
    "status": "new",
    "email": "Bob",
    "email_status": "",
    "full_name": "Bob the Builder",
    "avatar": "",
    "entity_type_description": "User",
    "is_login_account": 1,
    "user": {
      "locale": "",
      "location": "",
      "timezone": "",
      "user_first_name": "Bob",
      "user_gender": "male",
      "user_languages": "EN",
      "user_last_name": "Builder",
      "user_media_page": "",
      "user_middle_name": "B"
    },
    "relationshipSummary": {
      "isFriendedBy": [
        {
          "entity_id": 902,
          "full_name": "Jim Boots",
          "last_name": "Boots",
          "entity_type": "user"
        }
      ],
      "hasFriend": [
        {
          "entity_id": 903,
          "full_name": "Jill Jones",
          "last_name": "Jones",
          "entity_type": "user"
        }
      ]
    },
    "relationships": [
      {
        "relationship_id": 6,
        "relationship_type": "friend",
        "entity_id_1": 901,
        "entity_id_2": 902
      }
    ]
  };

  function getDummyUser(username) {
    if (username == 'bob') {
      return dummyUserBob;
    } else {
      return null;
    }
  }



  /*
   *  Perform an AJAX, using jQuery or Angular if available.
   */
  function authservice_ajax_call(method, urlpath, params, successCallback/*(response)*/, errorCallback/*(statusCode, statusText, error)*/) {

    var url = ENDPOINT + urlpath;
    console.log('authservice_ajax_call(method, ' + urlpath + ')')
    console.log(url)
    console.log(params);
    console.log("vvvvvv calling vvvvvv");

    // See if this is an Angular AJAX call
    if (_$http) {
      // Call the API to get the product details
      // ZZZZ This should use JSONP, as some browsers do not support CORS.
      // ZZZZ Unfortunately JSONP does not support headers, so we need
      // ZZZZ to pass details either in the url or the data. i.e. the
      // ZZZZ server requires changes.


      /*
       *  We'll use Angular's $http to call the authservice API.
       *
       *  See https://docs.angularjs.org/api/ng/service/$http
       */
console.log('*** Using Angular AJAX call');
      var req = {
        method: 'POST',
        url: url,
        data: params
      };
      _$http(req).then(function(response) { // success handler

        // Successful AJAX call.
        var data = response.data; // {string|Object} – The response body transformed with the transform functions.
        console.log('success:', data)
        return successCallback(data);

      }, function(response) { // error handler

        // Error during API call.
        var statusCode = response.status; // {number} – HTTP status code of the response.
        var statusText = response.statusText; // {string} – HTTP status text of the response.
        var error = response.data; // Maybe an error object was returned.
        if (errorCallback) {
          return errorCallback(statusCode, statusText, error);
        }

        // We have no error callback, so we'll report the error here and return null data.
        alert('An error occurred contacting Authservice.\nSee the Javascript console for details.')
        console.log('statusCode:', response)
        console.log('statusText:', statusText)
        console.log('error:', error)
        return successCallback(null);
      });


    } else {  // Use jQuery AJAX.

      // We don't have Angular's $http, so use jQuery AJAX.
      // See http://api.jquery.com/jquery.ajax/
console.log('*** Using jQuery AJAX call');
      var json = JSON.stringify(params)
      $.ajax({
        url: url,
        type: "POST", // Using CORS
        crossDomain: true,
        async: true,
        data: json,
        dataType: "json",
        contentType: 'application/json',
        success: function(response) {

          // Successful AJAX call.
          return successCallback(response);
        },
        error: function(jqxhr, textStatus, errorThrown) {

          // Error during AJAX call.
          var statusCode = jqxhr.status; // {number} – HTTP status code of the response.
          var statusText = jqxhr.statusText; // {string} null, "timeout", "error", "abort", or "parsererror"
          var error = errorThrown; // {string} "When an HTTP error occurs, errorThrown receives the textual portion of the HTTP status."
          if (errorCallback) {
            return errorCallback(statusCode, statusText, error);
          }

          // We have no error callback, so we'll report the error here and return null data.
          alert('An error occurred contacting Authservice.\nSee the Javascript console for details.')
          console.log('statusCode:', statusCode)
          console.log('statusText:', statusText)
          console.log('error:', error)
          return successCallback(null);
        }
      });
    }
  }

  /*
   *  With luck, a previous page logged in, and saved the current user
   *  details and an access token in a cookie so we could pick it up here.
   */
  function setCurrentUserFromCookie() {
    var json = getCookie(LOGIN_DETAILS_COOKIE_NAME);
    if (json) {
      try {
          // Parse the JSON, and check the required values exist
          var obj = JSON.parse(json); // May throw an exception
      } catch(e) {

          // Dud cookie data
          console.log('Error parsing login cookie', e);
          var isFromCookie = true;
          setCurrentUser(null, null, isFromCookie);
          return;
      }

      // Check the cookie data has user details.
      if (obj.user && obj.ttuat) {

        // All good.
        console.log("FOUND LOGIN COOKIE.", obj)
        var isFromCookie = true;
        setCurrentUser(obj.user, obj.ttuat, isFromCookie);
        return;

      } else {
        console.log('Login cookie missing user or ttuat');
      }

    } else {
      console.log('no login cookie');
    }

    // not a good cookie
    var isFromCookie = true;
    setCurrentUser(null, null, isFromCookie);
  }

  /*
   *  Place the current user details and access token in a cookie,
   *  so the next page we go to knows who are logged in as.
   */
  function setCookieFromCurrentUser() {

    if (_currentUser) {

      // Create a new object here, but not with all the details
      var cookieObj = {
        user: {
          id: _currentUser.id,
          fullname: _currentUser.fullname,
          avatar: _currentUser.avatar,
          firstname: _currentUser.firstname,
          lastname: _currentUser.lastname
        },
        ttuat: _ttuat
      }
      setCookie(LOGIN_DETAILS_COOKIE_NAME, JSON.stringify(cookieObj), LOGIN_TIMEOUT_DAYS);
    } else {
      // Remove the cookie
      setCookie(LOGIN_DETAILS_COOKIE_NAME, null, 0);
    }
  }

  function getCurrentUser() {

    //ZZZ We should return a clone so the original can't
    // be easily modified hacked from outside code.
    var clone = _currentUser;
    return clone;
  }

  function getCurrentUserId() {
    return _currentUser ? _currentUser.id : 0;
  }

  function getUserAccessToken() {
    return _ttuat;
  }

  function setCurrentUser(user, ttuat, fromCookie) {
    //console.log();
    console.log('++++++++>  setCurrentUser(): ttuat=' + ttuat + ', user=', user)

    // Change the current user.
    var oldCurrentUser = _currentUser;
    if (user) {
      //console.log('Setting _currentUser to ', user);

      // // If relationships are loaded, sort the summey
      // if (user.relationshipSummary) {
      //   var arrayOfFriends = user.relationshipSummary.hasFriend
      //   arrayOfFriends.sort(sortRelationshipSummaryByFullname)
      //
      //   // Short those who have friended me
      //   var arrayOfFriendedBy = user.relationshipSummary.isFriendedBy;
      //   arrayOfFriendedBy.sort(sortRelationshipSummaryByFullname)
      // }
      _currentUser = user;
      _currentEntityId = user.id;
      if (ttuat) {
        _ttuat = ttuat;
      }

      setCookieFromCurrentUser();
      $('.authservice-logged-in').show();
      $('.authservice-logged-out').hide();
      $('.authservice-current-user-firstname').text(user.firstname);
      $('.authservice-current-user-lastname').text(user.lastname);

      if(user.avatar) {
        $('.authservice-current-user-avatar').attr('src', user.avatar).show();
        $('.authservice-default-user-avatar').attr('src', user.avatar).hide();
      } else {
        $('.authservice-current-user-avatar').attr('src', user.avatar).hide();
        $('.authservice-default-user-avatar').attr('src', user.avatar).show();
      }

      if (_onUserChange) { // && oldCurrentUser==null) {

        var newUser = getCurrentUser(); // may be a clone
        var newTtuat = _ttuat;
        (_onUserChange)(newUser, newTtuat, fromCookie);
      }
    } else {

      // No longer logged in
      _currentUser = null;
      _currentEntityId = -1;
      _ttuat = null;
      setCookieFromCurrentUser();
      //setCookie(LOGIN_DETAILS_COOKIE_NAME, null, LOGIN_TIMEOUT_DAYS);
      $('.authservice-logged-in').hide();
      $('.authservice-logged-out').show();
      $('.authservice-current-user-firstname').text('');
      $('.authservice-current-user-lastname').text('');
      $('.authservice-current-user-avatar').attr('src', '').hide();
      if (_onUserChange) { // && oldCurrentUser != null) {
        var fromCookie = false;
        _onUserChange(null, null, fromCookie);
      }
    }
  }


  /*
  *  Set a cookie in the browser, for the entire site.
  */
  function setCookie(cname, cvalue, exdays) {
    //console.log('setCookie(' + cname + ', ' + cvalue + ')');
    var d = new Date();
    d.setTime(d.getTime() + (exdays*24*60*60*1000));
    var expires = "expires="+ d.toUTCString();
    document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
  }// setCookie()


  /*
  *  Get a cookie from the browser.
  */
  function getCookie(cname) {
    //console.log('getCookie(' + cname + ')')
    var name = cname + "=";
    var ca = document.cookie.split(';');
    for(var i = 0; i <ca.length; i++) {
      var c = ca[i];
      while (c.charAt(0) == ' ') {
        c = c.substring(1);
      }
      if (c.indexOf(name) == 0) {
        //console.log('- found cookie')
        return c.substring(name.length, c.length);
      }
    }
    //console.log('- no cookie with this name')
    return "";
  }// getCookie()



  // Create a new user object from the server-returned identity record.
  function convertIdentityToUser(identity) {
    var user = {
      //ttuat: _currentUser.ttuat,
      id: identity.id,
      authority: identity.authority,
      avatar: identity.avatar,
      // not email, or email_status
      //entityType: identity.entity_type_description,
      fullname: identity.full_name,
      status: identity.status,
      type: identity.type
    };

    // Handle user specific fields
    if (user.type == 'user') {
      // user.fullname = identity.user.full_name;
      // user.firstname = identity.user.first_name;
      // user.lastname = identity.user.last_name;
      user.locale = identity.user.locale;
      user.location = identity.user.location;
      user.timezone = identity.user.timezone;
      user.firstname = identity.user.user_first_name;
      user.gender = identity.user.user_gender;
      user.languages = identity.user.user_languages;
      user.lastname = identity.user.user_last_name;
      user.mediaPage = identity.user.user_media_page;
      user.middlename = identity.user.user_middle_name;
    }

    // Copy over the relationships and properties
    user.properties = identity.properties;
    user.propertySummary = identity.propertySummary;
    user.relationships = identity.relationships;
    user.relationshipSummary = identity.relationshipSummary;
    //user.privileges = identity.privileges;
    //user.privilegeSummary = identity.privilegeSummary;
    return user;
  }



  /**
  ***
  ***   Now comes the actual object used by the application.
  ***
  ***/
  return {

    setCookie: setCookie,
    getCookie: getCookie,
    getCurrentUser: getCurrentUser,
    getCurrentUserId: getCurrentUserId,
    getUserAccessToken: getUserAccessToken,


    init: function init(options) {
      console.log('authservice.init()')

      /*
      *  Check the input parameters.
      */
      var host = options.host ? options.host : 'authservice.io';
      var port = options.port ? options.port : 80;
      var version = options.version ? options.version : 'v1';
      var APIKEY = options.tenant;
      //ENDPOINT = 'http://' + host + ':' + port + '/' + version + '/' + APIKEY;
      ENDPOINT = '//' + host + ':' + port + '/' + version + '/' + APIKEY;
      //console.log('endpoint = ' + ENDPOINT);

      if (options.$http) {
        _$http = options.$http;
      }
      if (options.onUserChange) {
        _onUserChange = options.onUserChange;
      }


      // In pretend mode, we use hard coded usernames
      _pretend = (options.pretend) ? true : false;

      // See if we are currently logged in, based on the browser cookie.
      setCurrentUserFromCookie();


      /*
       *  Set up nice callbacks for buttons, etc.
       */
      $('#authservice-check-email').click(function(){
        $('#modalLogin').show();
        return false;
      });

      // Hide buttons if currently
      if(eval(getCurrentUserId()) <= 0){
        $('#authservice-logout-button').hide();
        $('#authservice-login-mainbutton').show();
        $('#authservice-settings-button').hide();
      }else{
        $('#authservice-logout-button').show();
        $('#authservice-settings-button').show();
        $('#authservice-login-mainbutton').hide();
      }

      $('#authservice-settings-button').click(function(){
        $('#_my-settings').addClass('active');
      });

      $('#authservice-signup-email-button').click(function(){
        alert($('#authservice-signup-email'));
      });

      $('#authservice-register-button').click(function(){
        $('#authservice-login-button').hide();
        $('#authservice-login-div').hide();
        $('#authservice-forgot-button').hide();
        $('#authservice-forgot-div').hide();
        $('#authservice-register-div').show();
        return false;
      });

      $('#authservice-login-mainbutton').click(function(){
        $('#modalLogin').modal('show');
        return false;
      });

      $('#authservice-forgot-cancel').click(authservice.resetLoginMenu);
      $('#authservice-forgot-ok').click(authservice.resetLoginMenu);
      $('#authservice-register-cancel').click(authservice.resetLoginMenu);
      $('#authservice-register-ok').click(authservice.resetLoginMenu);



      $('#authservice-logout-button').click(function(){
        var isFromCookie = false;
        setCurrentUser(null, null, isFromCookie);
        authservice.resetLoginMenu();
        $('#authservice-logout-button').hide();
        $('#authservice-settings-button').hide();
        $('#authservice-login-mainbutton').show();
        return false;
      });




      $('#authservice-login-submit').click(function() {
         var username = $('#authservice-login-username').val();
         var password = $('#authservice-login-password').val();

         authservice.login(username, password, function(user){
           // Success
           authservice.resetLoginMenu();
         }, function() {
           // Fail
           $('#authservice-login-errmsg').show();
         })

      });

      $('#authservice-loginEmail-submit').click(function() {
         var username = $('#authservice-loginEmail-username').val();
         var password = $('#authservice-loginEmail-password').val();

         authservice.login(username, password, function(user){
           // Success
           authservice.resetLoginMenu();
         }, function() {
           // Fail
           $('#authservice-loginEmail-errmsg').show();
         })

      });

      // Reset password
      $('#authservice-reset-password').click(function() {
        var username = $('#authservice-loginEmail-username').val();
        if(username == ''){
          $('#modalResetPassword').modal('show');
        }else{
            $('#modalGotMail').modal('show');
        }
      });

      $('#authservice-forgot-submit').click(function() {
        var username = $('#authservice-forgot-username').val();

        // Try to login
        var success = false;
        if (username == 'ok') success = true;
        if (success) {
          // Forward to some other page, or redraw this page
          $('#authservice-forgot-email2').val(username); // redisplay the email
          $('#authservice-forgot-button').hide();
          $('#authservice-forgot-div').hide();
          $('#authservice-forgot-done').show();
          return false;

        } else {
          // We don't tell the user if they have entered
          // and incorrect email address, as it could be used
          // by nasty people to fish for email addresses.
          // An error here indicates some sort of system error.
          $('#authservice-forgot-errmsg').show();
          return false;
        }
      });


      $('#authservice-register-submit').click(function() {
        var username = $('#authservice-register-username').val();
        var password = $('#authservice-register-password').val();

        // Try to login
        var success = false;
        if (password == 'ok') success = true;
        if (success) {
          // Display the sucess message
          $('#authservice-register-button').hide();
          $('#authservice-register-div').hide();
          $('#authservice-register-done').show();
          return false;
        } else {
          // Display an error message
          $('#authservice-register-errmsg').show();
          return false;
        }
      });//- click
    },// init()


    login: function login(username, password, successCallback, failCallback) {

      // If we are pretending, get the user details now.
      if (_pretend) {
        console.log('seems we are pretending')
        var user = getDummyUser(username);
        var isFromCookie = false;
        setCurrentUser(user, null, isFromCookie);
        //console.log('logged in now as', _currentUser);
        //authservice.resetLoginMenu();
        return successCallback(user);
      }

      /*
       *  Not pretending.
       *  Call the server to authenticate the username/password.
       */
      var params = {
        username: username,
        password: password
      };
      authservice_ajax_call('POST', '/login', params, function(response) {

          if (response.status == 'ok') {

            // Logged in.
            var user = convertIdentityToUser(response.identity);
            var ttuat = response.ttuat;
            var isFromCookie = false;
            setCurrentUser(user, ttuat, isFromCookie);
            return successCallback(user);
          } else {
            // Display an error message
            //$('#authservice-login-errmsg').show();
            return failCallback();
          }
      });
    },


    reloadUser: function reloadUser(callback) {
      console.log('reloadUser');

      // See if there is a current user.
      if (_currentUser == null) {
        var user = null;
        var ttuat = null;
        var fromCookie = false;
        setCurrentUser(user, ttuat, fromCookie);
        if (callback) {
          callback(null);
        }
      }

      // Perhaps we're using dummy data.
      if (_pretend) {
        console.log('reloading dummy data')
        var user = getDummyUser(_currentUser.username);
        var ttuat = null;
        var isFromCookie = false;
        setCurrentUser(user, ttuat, isFromCookie);
        return callback(user);
      }


      // Get the current user from the database again
      var params = {
        ttuat: _ttuat,
        //entityId: _currentEntityId,
        needRelationships: true,
        needProperties: true
      };
      authservice_ajax_call('POST', '/getIdentityWithAuthtoken', params, function(identities) {

        // API call SUCCESS
        console.log('back from /getIdentityWithAuthtoken ', identities)
        if (identities && identities.length > 0) {

          // Got the user.
          console.log('User details reloaded.');
          var user = convertIdentityToUser(identities[0]);
          var ttuat = _ttuat;
          var fromCookie = false;
          setCurrentUser(user, ttuat, fromCookie);
          if (callback) {
            callback(user)
          }
        } else {

          // Could not get the user. Must be logged out.
          console.log('Could not reload user. Must have timed out.');
          setCurrentUser(null, null, fromCookie);
          if (callback) {
            callback(null)
          }
        }
      }, function(statusCode, statusText, error) {

        // API call FAIL
        console.log('Was not able to reload the user:', statusCode, statusText, console.error);
        setCurrentUser(null, null, fromCookie);
        if (callback) {
          callback(null)
        }
      });
    },// reloadUser



    /*
     *  Reset the login menu.
     */
    resetLoginMenu: function resetLoginMenu() {
      $('#modalLogin').modal('hide');
      $('#authservice-login-mainbutton').hide();
      $('#authservice-logout-button').show();
      $('#authservice-settings-button').show();
      return true;
    },


    getUser: function getUser(params, callback/*(user)*/) {
      console.log('getUser()');
      authservice_ajax_call('POST', '/admin/getUser', params, callback);
    }, //getUser


    /*
     *  Create a new auth_relationship
     */
    addRelationship: function addRelationship(params, callback/*(result)*/) {
      console.log('addRelationship()');
      authservice_ajax_call('POST', '/admin/addRelationship', params, callback);
    },// addRelationship


    /*
     *  Remove an auth_relationship
     */
    removeRelationship: function removeRelationship(params, callback/*(result)*/) {
      console.log('removeRelationship()');
      authservice_ajax_call('POST', '/admin/removeRelationship', params, callback);
    },// addRelationship



    /*
     *  Create a new auth_property
     */
    addProperty: function addProperty(params, callback/*(result)*/) {
      console.log('addProperty()');
      authservice_ajax_call('POST', '/admin/addProperty', params, callback);
    },// addRelationship


    /*
     *  Remove an auth_property
     */
    removeProperty: function removeProperty(params, callback/*(result)*/) {
      console.log('removeProperty()');
      authservice_ajax_call('POST', '/admin/removeProperty', params, callback);
    },// addRelationship


    nocomma: null


  };//- object

})(); // authservice


//tta2.init('http://localhost:9090', 'nodeclient');
//tta2.init('http://127.0.0.1:9090', 'nodeclient');
