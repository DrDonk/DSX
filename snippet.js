<html>
<head lang="en">
    <meta charset="UTF-8">
    <title>VM Web Console</title>

    <!-- common js/css lib -->
    <link href="css/wmks-all.css" rel="stylesheet" type="text/css" />
    <link href="css/jquery-ui.css" rel="stylesheet" type="text/css" />
    <script src="lib/jquery-1.8.3.min.js"></script>
    <script src="lib/jquery-ui-1.8.16.min.js"></script>
    <script src="lib/wmks.js"></script>
    <!-- wmks.js can downloaded from https://vcenter_ip:9443/vsphere-client/js/wmks.js, other files can be downloaded from HTML Console SDK -->

    <script>

    There are 3 approaches for showing Web Console of a VM in vCenter 6.0

    // 1) mksTicket authentication. This is not publicly documented.
    // Get ticket from https://vcenter_ip/mob/?moid=vm-57&method=acquireMksTicket
    //var url = "wss://vcenter_ip:9443/vsphere-client/webconsole/authd?mksTicket=52c10d92-1867-4a0e-4c2e-d97df164a817&host=vcenter_ip&port=902&cfgFile=%2Fvmfs%2Fvolumes%2F56600453-39658cc7-9ec6-002219644073%2FNode1%2FNode1.vmx&sslThumbprint=9F:C5:E9:6C:97:ED:CE:0B:BD:86:9F:5F:E7:AB:1C:E2:CA:46:E2:C2";

    // 2) webmksTicket authentication. This is described on a blog http://vittoriop77.blogspot.it/2016/03/vsphere-6-html-console.html
    // Get ticket from  https://vcenter_ip/mob/?moid=vm-57&method=acquireTicket with ticketType 'webmks'
    //var url = "wss://vm_ip:443/ticket/5705500be7278979";

    // 3) CloneSessionTicket authentication
    // Get ticket from https://vcenter_ip/mob/?moid=SessionManager&method=acquireCloneTicket
    var url = "wss://vcenter_ip/vsphere-client/webconsole/authd?vmId=vm-57&vmName=Node1&serverGuid=197cb8a1-4eb3-45ab-a884-fc570c868e49&host=vcenter_ip:443&sessionTicket=cst-VCT-52adf3a2-7b2e-fb7e-0f12-a1e7d66d0c2c--tp-A1-4A-38-40-F8-91-81-B7-44-C2-65-10-B8-4B-25-AB-8B-36-09-C3";
 

        $(document).ready(function(){
                          _wmks = $("#wmksContainer")
                          .wmks({"useVNCHandshake" : false, "sendProperMouseWheelDeltas": true,"fitToParent":true})
                          .bind("wmksconnecting", function() {
                                console.log("The console is connecting");
                                })
                          .bind("wmksconnected", function() {
                                console.log("The console has been connected");
                                })
                          .bind("wmksdisconnected", function(evt, info) {
                                console.log("The console has been disconnected");
                                console.log(evt, info);
                                })
                          .bind("wmkserror", function(evt, errObj) {
                                console.log("Error!");
                                console.log(evt, errObj);
                                })
                          .bind("wmksiniterror", function(evt, customData) {
                                console.log(evt);
                                console.log(customData);
                                })
                          .bind("wmksresolutionchanged", function(canvas) {
                                console.log("Resolution has changed!");
                                })

                          _wmks.wmks("connect", url);
                        });

    </script>
</head>
                          
<body>
    <div>This is a sample of showing Web Console of a VM in vCenter 6.0.</div>
    <div id="wmksContainer" style="position:absolute;width:100%;height:100%"></div>
</body>