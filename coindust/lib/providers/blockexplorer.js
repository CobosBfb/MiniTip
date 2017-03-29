var request = require('request-promise')

module.exports = function () {
  var o = {}
  var api_url = 'https://blockexplorer.com/api/addr/'

  o.getBalance = function (address) {
    var url = api_url + address + '/balance'
    var url1 = api_url + address + '/unconfirmedbalance'
    return request.get(url)
      .then(function (body) {
        return request.get(url1)
          .then(function (body1) {
        d = parseFloat(body);
        d1 = parseFloat(body1);
        if (d1 < 0) {
          return (d + d1);
        } else {
          return d;
        }
      })
    });
  }

  return o
}()

