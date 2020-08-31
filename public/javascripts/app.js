$(function () {
  'use strict';

  var currentUri = null;
  var socketUrl = window.location.protocol + '//' + window.location.host;
  var socket;

  /* please update this to your own slack webhook incoming url
  and the appropriate slack channel */
  var slackWebhook = "https://hooks.slack.com/services/<unique_code>";

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
      let attachments_color = "#c7c7c7";
      try {
        let payload = {
          "channel": slackChannel,
          "blocks": [
            {
              "type": "divider"
            },
            {
              "type": "section",
              "text": {
                "type": "mrkdwn",
                "text": getSection1SlackText(event)
              },
              "accessory": {
                "type": "image",
                "image_url": "https://user-images.githubusercontent.com/6910192/91432322-2fe13380-e87f-11ea-905d-6263d468957b.png",
                "alt_text": "Creative Cloud"
              }
            },
            {
              "type": "context",
              "elements": [
                {
                  "type": "mrkdwn",
                  "text": getContextSectionSlackText(event)
                }
              ]
            }
          ],
          "attachments": [{
            "color": attachments_color,
            "blocks": [
              {
                "type": "section",
                "text": {
                  "type": "mrkdwn",
                  "text": getAttachmentText(event)
                }
              }
            ]
          }]
          // "attachments": [{
          //   "text": getAttachmentText(event),
          //   "fallback": "You have received a new message from CC Libraries via I/O Events!",
          //   "color": attachments_color,
          //   "attachment_type": "default"
          // }]
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
        console.log("ERROR: " + data.responseText);
      }
    });
  }

  function getSection1SlackText(event) {
    let repoMetadata = getRepoMetadata(event);
    let userId = repoMetadata["storage:assignee"]["id"];
    let actionText = getEventActionText(event);
    let assetId = repoMetadata["repo:id"];
    let storageRegion = repoMetadata["storage:region"];
    let assetVersion = repoMetadata["repo:version"];
    let eventResourceChangesText = getEventResourceChangesText(event);
    return `A Creative Cloud Library was *${actionText}* by user *${userId}* in *${storageRegion}* region.\n\n_Asset Id_: \`${assetId}\`\n_Resource Changes:_${eventResourceChangesText}\n_Version: ${assetVersion}_`;
  }

  function getContextSectionSlackText(event) {
    let eventBody = event.body;
    let requestId = eventBody["xactionid"];
    let source = eventBody["source"];
    return `:creativeresidency: Request Id: ${requestId}`;
  }

  function getEventResources(event) {
    return event.body["data"]["xdmEntity"]["event:resources"];
  }

  function getRepoMetadata(event) {
    let eventResources = getEventResources(event);
    return eventResources["http://ns.adobe.com/adobecloud/rel/metadata/repository"]["event:embedded"];
  }

  function getEventResourceChangesText(event) {
    let eventResources = getEventResources(event);
    let eventResourceChangesText = "";
    for (let prop in eventResources) {
      if (eventResources.hasOwnProperty(prop)) {
        let eventAction = titleCase(eventResources[prop]["event:action"]);
        let resourceFriendlyName = getResourceFriendlyNameFromNamespaceKey(
            prop);
        eventResourceChangesText += `\n\t- *${resourceFriendlyName}*: ${eventAction}`;
      }
    }
    return eventResourceChangesText;
  }

  function getResourceFriendlyNameFromNamespaceKey(propName) {
    switch (propName) {
      case "http://ns.adobe.com/adobecloud/rel/manifest":
        return "Composite Manifest";
      case "http://ns.adobe.com/adobecloud/rel/component":
        return "Composite Component";
      case "http://ns.adobe.com/adobecloud/rel/metadata/embedded":
        return "Embedded Metadata";
      case "http://ns.adobe.com/adobecloud/rel/metadata/repository":
        return "Repository Metadata";
      case "http://ns.adobe.com/adobecloud/rel/metadata/application":
        return "Application Metadata";
      case "http://ns.adobe.com/adobecloud/rel/primary":
        return "Primary Resource";
      case "http://ns.adobe.com/adobecloud/rel/rendition":
        return "Rendition";
      case "http://ns.adobe.com/adobecloud/rel/repository":
        return "Repository Resource";
    }
  }

  function getEventActionText(event) {
    let action = event.body["type"];
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

  function getAttachmentText(event) {
    let jsonText = JSON.stringify(event.body, null, 1);
    let truncatedText = truncate(jsonText, 2994);
    return  "```" + truncatedText + "```";
  }

  function titleCase(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  function truncate(str, length, ending) {
    if (length == null) {
      length = 2994;
    }
    if (ending == null) {
      ending = '...';
    }
    if (str.length > length) {
      return str.substring(0, length - ending.length) + ending;
    } else {
      return str;
    }
  }
});
