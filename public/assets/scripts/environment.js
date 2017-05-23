
var LOCAL_DEPLOYENT = false;
var STORE_ID = 6;

// Authservice-related
if (LOCAL_DEPLOYENT) {

  // Local Authservice
  var AUTHSERVICE_HOST = 'localhost';
  var AUTHSERVICE_PORT = 9090;
  var AUTHSERVICE_TENANT = 'nodeclient';
  var AUTHSERVICE_USE_DUMMY_LOGIN = false;

  // Local Crowdhound
  var CROWDHOUND_HOST = 'localhost';
  var CROWDHOUND_PORT = 4000;
  var CROWDHOUND_VERSION = "2.0";
  var CROWDHOUND_TENANT = 'drinkpoint';


} else {
  var REMOTE_PREFIX = 'ratdev';

  // Authservice
  var AUTHSERVICE_HOST = REMOTE_PREFIX + '.authservice.io';
  var AUTHSERVICE_PORT = 80;
  var AUTHSERVICE_TENANT = 'nodeclient';
  var AUTHSERVICE_USE_DUMMY_LOGIN = false;

  // Crowdhound
  //var CROWDHOUND_HOST = REMOTE_PREFIX + '.crowdhound.io';
  //var CROWDHOUND_PORT = 80;
  var CROWDHOUND_HOST = 'localhost';
  var CROWDHOUND_PORT = 4000;
  var CROWDHOUND_VERSION = "2.0";
  var CROWDHOUND_TENANT = 'drinkpoint';

}
