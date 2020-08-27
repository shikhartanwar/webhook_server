$(function () {
  'use strict';

  var currentUri = null;
  var socketUrl = window.location.protocol + '//' + window.location.host;
  var socket;

  /* please update this to your own slack webhook incoming url
  and the appropriate slack channel */
  var slackWebhook = "https://hooks.slack.com/services/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";

  var slackChannel = "aio-444-demo";

  $('#connectForm').submit(function (e) {

    e.preventDefault();
    if (currentUri) {
      socket.removeAllListeners(currentUri);
    }
    socket = io.connect(socketUrl);
    socket.on('connection', function (data) {
      $('#log-list').append(
          '<li class="list-group-item">Connected to server</li>');
      console.log(data);
    });

    var uri = $('#webhookUri').val().trim();

    var currentUri = uri === '*' ? 'webhookEvent:all' : 'webhookEvent:' + uri;

    var webhookUrl = socketUrl + '/webhook/' + uri
    $('#log-list').prepend($('<li></li>').attr('class', 'list-group-item').html(
        'Connected to: <a target="_blank" href="' + webhookUrl + '">'
        + webhookUrl + '</a>'));

    socket.on(currentUri, function (event, data) {
      // console.log(currentUri, event, data);
      addLog(event);
      let mes;
      let attachments_color_green = "#008000";
      try {
        let slackText = getSlackText(event);
        let payload = {
          "channel": slackChannel,
          "username": "incoming-webhook",
          "mrkdwn": true,
          "attachments": [{
            // "text": "Test " + JSON.stringify(event.body),
            "text": getSlackText(event),
            "fallback": "You have received a new message from io_triggers!",
            "color": attachments_color_green,
            "attachment_type": "default"
          }]
        };
        mes = JSON.stringify(payload);
      } catch (err) {
        console.log("Something Went Wrong: " + err.message);
      }

      /*
       * post message to Slack
       */

      if (mes) {
        postToSlack(mes);
      }

    });

  });

  function listen(uri) {

  }

  window.toggleListItem = function (item) {
    $(item).next('.list-group-item-body').toggle();
  }

  function addLog(log) {
    $('#logItemTemplate').tmpl(log).prependTo('#log-list')
  }

  function postToSlack(mes) {
    $.ajax({
      url: slackWebhook,
      type: 'POST',
      processData: true,
      data: mes,
      // result will show on console
      success: function (data) {
        console.log("SUCCESS: " + data);
      },
      error: function (data) {
        console.log("ERROR: " + data);
      }
    });
  }

  function getSlackText(event) {
    let eventBody = event.body;
    let eventData = eventBody["data"]["xdmEntity"]["event:resources"];
    let repoMetadata = eventData["http://ns.adobe.com/adobecloud/rel/metadata/repository"]["event:embedded"];
    let userId = repoMetadata["storage:assignee"]["id"];
    let actionText = getEventActionText(eventBody["type"]);
    let assetId = repoMetadata["repo:id"];
    let assetVersion = repoMetadata["repo:version"];
    let storageRegion = repoMetadata["storage:region"];
    let slackText = `A Creative Cloud Library (\`${assetId}\`) was *${actionText}* by user *${userId}* in ${storageRegion} region.\n_Version_: ${assetVersion}`;
    console.log(slackText);
    return slackText;
  }

  function getEventActionText(action) {
    let actionText;
    switch (action) {
      case "com.adobe.platform.events.cc_library_created":
        actionText = "created";
        break;
      case "com.adobe.platform.events.cc_library_updated":
        actionText = "updated";
        break;
      case "com.adobe.platform.events.cc_library_deleted":
        actionText = "deleted";
    }
    return actionText;
  }
});
