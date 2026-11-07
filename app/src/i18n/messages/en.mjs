// SPDX-License-Identifier: AGPL-3.0-or-later
// Draft translation (team-authored, not yet language-reviewed).
export default {
  "lang.label": "Language",
  "display.group": "Display settings",
  "display.dark": "Dark mode",
  "display.toLight": "Switch to light mode",
  "display.toDark": "Switch to dark mode",
  "display.mode": "Interface mode",
  "display.standard": "Standard",
  "display.child": "Kids",
  "display.senior": "Senior",

  "floor.B1": "Basement 1",
  "floor.B2": "Basement 2",
  "floor.B3": "Basement 3",
  "floor.B4": "Basement 4",
  "zone.b1-passage": "Station passage",
  "zone.b2-concourse": "Bannan Line concourse",
  "zone.b3-blue": "Bannan Line platform",
  "zone.b3-red": "Tamsui-Xinyi Line concourse",
  "zone.b4-platform": "Tamsui-Xinyi Line platform",

  "type.elevator": "Elevator",
  "type.restroom": "Restroom",
  "type.nursing": "Nursing room",
  "type.info": "Information desk",
  "type.ticket": "Ticket office",
  "type.aed": "AED",
  "type.phone": "Public phone",
  "type.escalator": "Escalator",
  "type.stairs": "Stairs",
  "type.stairs-escalator": "Stairs / escalator",
  "type.stairway": "Floor access",
  "type.water": "Drinking water",
  "type.locker": "Lockers",
  "type.accessible": "Wheelchair waiting area",
  "help.elevator": "Elevator: change floors without using stairs.",
  "help.stairs": "Stairs: walk step by step to another floor.",
  "help.escalator":
    "Escalator: moving stairs. Check the direction before you step on.",
  "help.stairs-escalator":
    "A way to another floor. Check the signs for stairs or an escalator.",
  "help.stairway":
    "A way to another floor. Check the signs for the type and direction.",
  "help.restroom": "Restroom: toilets and sinks.",
  "help.nursing":
    "Nursing room: a place to care for a baby, breastfeed or pump milk.",
  "help.info": "Information desk: ask the staff if you have a question.",
  "help.ticket": "Ticket office: ask about or buy tickets.",
  "help.aed":
    "AED: emergency equipment. If someone needs first aid, ask the staff for help.",
  "help.phone": "Public phone: a place to make a phone call.",
  "help.water": "Drinking water: follow the signs on the machine.",
  "help.locker": "Lockers: leave your bags here for a while.",
  "help.accessible":
    "Wheelchair waiting area: space for wheelchair users to wait for the train.",

  "map.childHint":
    "First pick what you are looking for, then tap its icon on the map.",
  "map.floorGroup": "Choose a floor",
  "map.layersAria": "Show other floors",
  "map.layers": "Show all floors",
  "map.facilities": "Facilities",
  "map.pointCount": "{count} places",
  "map.themesAria": "Facilities, swipe sideways for more",
  "map.mapAria": "Station map",
  "map.compass": "North is up, tilted slightly left",
  "map.backToStart": "Back to start",
  "map.interactiveAria":
    "{floor} interactive map. Press plus or minus to zoom, 0 to reset",
  "map.planAria": "{floor} floor plan",
  "map.ariaYouAreHere": ", you are here",
  "map.ariaDestination": ", destination",
  "map.youAreHere": "You are here",
  "map.footerNote":
    "Redrawn from public station maps. Positions are approximate; follow the signs on site.",
  "map.dataStatus":
    "Data: {points} places, {connections} floor links ({unverified} not yet checked on site), no walking network yet.",
  "map.about": "Source code & licenses · version {version}",
  "map.sourceInfo": "Taipei Metro {floor} information map",
  "map.sourceFacilities": "Taipei Metro station facilities",
  "map.sourceSection": "Taipei Metro station cross-section",
  "map.connectorUnknown":
    "The plan shows a way up or down; its type and direction are not confirmed yet.",
  "map.connectorInferred":
    "The stairs and escalator layout is estimated. Follow the signs on site.",
  "map.escalatorDirection": "Check the signs for the escalator direction.",
  "map.originalName": "Name on site: {name}",

  "scan.navigation": "Navigation",
  "scan.browsing": "Browsing",
  "scan.easyRead": "Easy read",
  "scan.caveat":
    "Location codes are not installed in the station yet. For now we show facilities and floor links; a full walking network is still missing.",
  "scan.browseHint":
    "Scan a location QR code to start navigation and show “You are here”.",
  "scan.chooseDestination": "Choose a destination",
  "scan.choosePlaceholder": "Where do you want to go?",
  "scan.useSelected": "Set “{name}” selected on the map as the destination",
  "scan.searchByName": "Search by name (seven-language prototype)",
  "scan.stepFree": "Step-free links only",
  "scan.destination": "Destination: {place}",
  "scan.youAreHere": "You are here: {place}",
  "scan.notLocated": "Location not set yet. Scan the code where you are.",
  "scan.scannedAt":
    "Scanned at {time}. Your position does not update as you walk.",
  "scan.fromLink":
    "Set from a location link. Please check where you are; this is not live tracking.",
  "scan.waiting": "Waiting for the scan…",
  "scan.rescan": "Scan again",
  "scan.scan": "Scan location",
  "scan.needApp":
    "Open this in the TownPass app to use the scanner. In a browser you can only view location links.",
  "scan.arrivedTitle": "You confirmed you have arrived",
  "scan.currentHint": "Current tip",
  "scan.unavailable": "Not working",
  "scan.confirmArrival": "The name and floor match — I have arrived",
  "scan.excluded": "Excluded from search: {list} (start again to clear)",
  "scan.exit": "Stop navigation and go back to browsing",
  "scan.stepPair": "{from} to {to}",
  "scan.listSeparator": "; ",
  "scan.instr.arrived":
    "You confirmed you have arrived. Stop navigation or choose your next destination.",
  "scan.instr.atDestination":
    "Your location and destination are the same. Check the name and floor on site, then confirm you have arrived.",
  "scan.instr.sameZone":
    "You are in the same area as your destination. There is no checked walking route yet; follow the signs and scan again on the way.",
  "scan.instr.connections":
    "Floor links you can use: {steps}. These show how floors connect, not a full walking route. Please follow the signs.",
  "scan.instr.none":
    "No known link matches your settings. Please ask station staff. We never replace a step-free need with stairs or unknown equipment.",

  "notice.linkLoaded": "Location set from a link. Please check where you are.",
  "notice.linkInvalid":
    "The location link is invalid or the place does not exist. Back to browsing.",
  "notice.waiting": "Waiting for the TownPass scanner…",
  "notice.located":
    "Location updated — you are here. Choose a destination or keep exploring the map.",
  "notice.locatedUrlFailed":
    "Location updated, but the page address could not be saved. Please scan again.",
  "notice.Cancelled": "Scan cancelled. Your location has not changed.",
  "notice.Unavailable": "Open this in the TownPass app to use the scanner.",
  "notice.Busy":
    "A scan is still running. Finish it or close the scanner first.",
  "notice.Timeout":
    "The scan timed out. Close the scanner first; you can scan again once the old reply clears. If needed, close and reopen the service.",
  "notice.WaitingForDrain":
    "Still waiting for the previous scan. Close the scanner first; if needed, close and reopen the service.",
  "notice.SendFailed":
    "The scanner could not start. Close and reopen the service, then try again.",
  "notice.InvalidReply":
    "The app sent an unexpected reply. Your location has not changed.",
  "notice.unsupportedCode":
    "This code is not a location on this map. Your location and destination have not changed.",
  "notice.resetUrlFailed":
    "The page address could not be updated. Remove the point setting and reopen the map.",
  "notice.suspended":
    "Scanning paused. Your location has not changed. Close the scanner first.",
};
