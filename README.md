osrm-indus
==========

This project automate the creation of route planner profiles.

Everything is accessible by API.

EASY !!

# 1 PUT  profile
curl  --data-binary "@foot.lua"  -X POST http://myserver.com:3000/profiles/wheelchair\?apikey\=42

# 2 API CALL
http://myserver.com:3000/osrm/wheelchair/viaroute


Each time you put a profie, a worker compile in background a new osrm instance with this profile.
It runs on a dedicated port but the api end point in node.js will redirect to this instance api knowing the local port bindings.

1 - api call to nodejs back -> /osrm/wheelchair
2 - redirect to local services related to wheelchair profile
3 - render back api result to client

## Improvements

 - add multiple maps
 - handle compiling errors and status
 - more infos on profiles
 - manage osrm instances runs with monit or something like this
