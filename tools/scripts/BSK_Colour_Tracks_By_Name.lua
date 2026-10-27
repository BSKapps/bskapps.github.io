-- @description BSK Auto Color (setup window: colour and icon tracks by name)
-- @author BSK
-- @version 2.0
-- @about Opens the Auto Color window. Click a group's color or icon to change it, Edit to rename it or change its words, Remove to take it away, Add Group for a new one, and Reset to Defaults for the original groups. Apply to Tracks gives every track whose name has one of a group's words that group's color (and icon when "Set icons too" is ticked), then lists what changed. One undo reverts it. Groups are checked top to bottom and the first match wins. Words are whole words in any case, a plural "s" is fine, and names like "AcGtr" or "Gtr1" are split into words. Tracks that match nothing are left as they are. REAPER keeps your groups between runs.

local DEFAULT_GROUPS = {
  { name = "FX",         color = "#2FA39A", icon = "fx.png",      words = { "fx", "reverb", "verb", "rvb", "rev", "delay", "dly", "echo" } },
  { name = "Vocals",     color = "#4A90D9", icon = "mic.png",     words = { "vox", "voc", "vocal", "bv", "bvox", "backing", "mc", "speech" } },
  { name = "Drums",      color = "#D9534F", icon = "drums.png",   words = { "kick", "kik", "snare", "snr", "tom", "rack", "floor", "spd", "hat", "hihat", "hh", "oh", "overhead", "ride", "crash", "cym", "cymbal", "drum", "kit", "room" } },
  { name = "Percussion", color = "#E8913A", icon = "congas.png",  words = { "perc", "percussion", "conga", "bongo", "shaker", "tamb", "tambourine", "cajon" } },
  { name = "Bass",       color = "#8E6BD1", icon = "bass.png",    words = { "bass", "bgtr" } },
  { name = "Guitars",    color = "#D9B23A", icon = "guitar.png",  words = { "gtr", "guitar", "acoustic", "agtr", "egtr" } },
  { name = "Keys",       color = "#4CAF6A", icon = "piano.png",   words = { "key", "keyboard", "piano", "pno", "organ", "synth", "rhodes", "wurli" } },
  { name = "Strings",    color = "#D46AA8", icon = "violin.png",  words = { "string", "fiddle", "violin", "viola", "cello", "vln" } },
  { name = "Horns",      color = "#B07A4A", icon = "trumpet.png", words = { "horn", "brass", "sax", "saxophone", "trumpet", "tpt", "trombone", "tbn", "flute" } },
}

local SECTION = "BSK_AutoColor"
local TITLE = "Auto Color"
local NEW_GROUP_COLOR = "#808080"
local ACCENT = "#2FA39A"

local W, PAD, ROWS_Y, ROW_H, MAX_ROWS, BTN_H = 580, 12, 56, 30, 20, 28

local iconFolder = reaper.GetResourcePath() .. "/Data/track_icons/"

local function trim(text)
  return (text:match("^%s*(.-)%s*$"))
end

local function copyGroups(source)
  local groups = {}
  for i, group in ipairs(source) do
    local words = {}
    for j, word in ipairs(group.words) do words[j] = word end
    groups[i] = { name = group.name, color = group.color, icon = group.icon or "", words = words }
  end
  return groups
end

local function splitWords(text)
  local words = {}
  for part in text:gmatch("[^,]+") do
    local word = trim(part)
    if word ~= "" then words[#words + 1] = word end
  end
  return words
end

local function encode(text)
  return (text:gsub("[^%w%-%._,#'&()+!/]", function(c) return string.format("%%%02X", c:byte()) end))
end

local function decode(text)
  return (text:gsub("%%(%x%x)", function(hex) return string.char(tonumber(hex, 16)) end))
end

local function validColor(color)
  return color:match("^#%x%x%x%x%x%x$") ~= nil
end

local function loadSettings()
  local state = { groups = copyGroups(DEFAULT_GROUPS) }
  local saved = reaper.GetExtState(SECTION, "groups")
  if saved == "v1" or saved:sub(1, 3) == "v1;" then
    local groups = {}
    for entry in saved:gmatch(";([^;]*)") do
      local name, color, icon, words = entry:match("^([^|]*)|([^|]*)|([^|]*)|([^|]*)$")
      if name then
        color = decode(color)
        groups[#groups + 1] = {
          name = decode(name),
          color = validColor(color) and color or NEW_GROUP_COLOR,
          icon = decode(icon),
          words = splitWords(decode(words)),
        }
      end
    end
    state.groups = groups
  end
  state.setIcons = reaper.GetExtState(SECTION, "set_icons") ~= "0"
  return state
end

local function saveGroups(state)
  local parts = { "v1" }
  for _, group in ipairs(state.groups) do
    parts[#parts + 1] = encode(group.name) .. "|" .. encode(group.color) .. "|" .. encode(group.icon) .. "|" .. encode(table.concat(group.words, ","))
  end
  reaper.SetExtState(SECTION, "groups", table.concat(parts, ";"), true)
end

local function saveSetIcons(state)
  reaper.SetExtState(SECTION, "set_icons", state.setIcons and "1" or "0", true)
end

local function splitIntoWords(text)
  local words = {}
  local spaced = text:gsub("(%l)(%u)", "%1 %2"):lower()
  for word in spaced:gmatch("%a+") do words[#words + 1] = word end
  return words
end

local function nameWords(name)
  local words = {}
  for _, word in ipairs(splitIntoWords(name)) do words[word] = true end
  return words
end

local function hasKeyword(words, keyword)
  local parts = splitIntoWords(keyword)
  if #parts == 0 then return false end
  for _, part in ipairs(parts) do
    if not (words[part] or words[part .. "s"]) then return false end
  end
  return true
end

local function groupFor(name, groups)
  local words = nameWords(name)
  for _, group in ipairs(groups) do
    for _, keyword in ipairs(group.words) do
      if hasKeyword(words, keyword) then return group end
    end
  end
  return nil
end

local function nativeColor(hex)
  local r, g, b = hex:match("^#?(%x%x)(%x%x)(%x%x)$")
  if not r then return nil end
  return reaper.ColorToNative(tonumber(r, 16), tonumber(g, 16), tonumber(b, 16)) | 0x1000000
end

local function isFullPath(path)
  return path:match("^/") ~= nil or path:match("^%a:[\\/]") ~= nil or path:match("^\\\\") ~= nil
end

local function iconPath(icon)
  if isFullPath(icon) then return icon end
  return iconFolder .. icon
end

local function applyToTracks(state)
  local trackCount = reaper.CountTracks(0)
  if trackCount == 0 then
    reaper.ShowMessageBox("No tracks in project.", TITLE, 0)
    return false
  end

  local proposals = {}
  for i = 0, trackCount - 1 do
    local track = reaper.GetTrack(0, i)
    local _, name = reaper.GetSetMediaTrackInfo_String(track, "P_NAME", "", false)
    local group = groupFor(name, state.groups)
    if group then
      proposals[#proposals + 1] = { track = track, number = i + 1, name = name, group = group }
    end
  end

  if #proposals == 0 then
    reaper.ShowMessageBox("No track names matched any group, so nothing changed.", TITLE, 0)
    return false
  end

  local maxLines = 40
  local lines = {}
  for i = 1, #proposals do
    if i > maxLines then
      lines[#lines + 1] = "  ... and " .. (#proposals - maxLines) .. " more"
      break
    end
    lines[#lines + 1] = "  " .. proposals[i].number .. ":  " .. proposals[i].name .. "  ->  " .. proposals[i].group.name
  end

  local missingIcons, noIcons = {}, {}

  reaper.PreventUIRefresh(1)
  reaper.Undo_BeginBlock()
  for _, p in ipairs(proposals) do
    local group = p.group
    local color = nativeColor(group.color)
    if color then reaper.SetMediaTrackInfo_Value(p.track, "I_CUSTOMCOLOR", color) end
    if state.setIcons then
      if group.icon == "" then
        noIcons[group] = true
      elseif reaper.file_exists(iconPath(group.icon)) then
        reaper.GetSetMediaTrackInfo_String(p.track, "P_ICON", group.icon, true)
      else
        missingIcons[group] = true
      end
    end
  end
  reaper.Undo_EndBlock("Auto color tracks by name", 1)
  reaper.PreventUIRefresh(-1)
  reaper.TrackList_AdjustWindows(false)

  local missing, without = {}, {}
  for _, group in ipairs(state.groups) do
    if missingIcons[group] then missing[#missing + 1] = group.name .. " (" .. group.icon .. ")" end
    if noIcons[group] then without[#without + 1] = group.name end
  end
  local message =
    (state.setIcons and "Color and icon set on these " or "Color set on these ") ..
    #proposals .. " track(s):\n\n" ..
    table.concat(lines, "\n") .. "\n\n" ..
    (trackCount - #proposals) .. " track(s) left as they were."
  if #missing > 0 then
    message = message .. "\n\nColor only, icon missing: " .. table.concat(missing, ", ") .. "."
  end
  if #without > 0 then
    message = message .. "\n\nColor only, no icon chosen: " .. table.concat(without, ", ") .. "."
  end
  reaper.ShowMessageBox(message, TITLE, 0)
  return true
end

local state = loadSettings()
local scroll = 0
local hits = {}
local pressedKey = nil
local wasDown = false
local scale = 1
local iconCache = {}
local nextSlot = 0
local shownHeight

local function groupDialog(title, name, words)
  local ok, values = reaper.GetUserInputs(title, 2, "Name,Words,separator=|,extrawidth=250", name .. "|" .. table.concat(words, ", "))
  if not ok then return nil end
  local newName, newWords = values:match("^([^|]*)|(.*)$")
  if not newName then return nil end
  newName = trim(newName)
  if newName == "" then
    reaper.ShowMessageBox("Enter a group name.", TITLE, 0)
    return nil
  end
  return newName, splitWords(newWords)
end

local function pickColor(group)
  local ok, color = reaper.GR_SelectColor(reaper.GetMainHwnd())
  if ok == 0 then return end
  local r, g, b = reaper.ColorFromNative(color)
  group.color = string.format("#%02X%02X%02X", r, g, b)
  saveGroups(state)
end

local function pickIcon(group)
  local start = group.icon ~= "" and iconPath(group.icon) or iconFolder
  local ok, path = reaper.GetUserFileNameForRead(start, "Choose an icon for " .. group.name, "png")
  if not ok or path == "" then return end
  local folder = iconFolder:gsub("\\", "/"):lower()
  if path:gsub("\\", "/"):lower():sub(1, #folder) == folder then
    group.icon = path:sub(#folder + 1)
  else
    group.icon = path
  end
  saveGroups(state)
end

local function editGroup(group)
  local name, words = groupDialog("Edit Group", group.name, group.words)
  if not name then return end
  group.name, group.words = name, words
  saveGroups(state)
end

local function removeGroup(index)
  table.remove(state.groups, index)
  saveGroups(state)
end

local function addGroup()
  local name, words = groupDialog("Add Group", "", {})
  if not name then return end
  state.groups[#state.groups + 1] = { name = name, color = NEW_GROUP_COLOR, icon = "", words = words }
  scroll = math.max(0, #state.groups - MAX_ROWS)
  saveGroups(state)
end

local function resetToDefaults()
  state.groups = copyGroups(DEFAULT_GROUPS)
  scroll = 0
  reaper.DeleteExtState(SECTION, "groups", true)
end

local function toggleSetIcons()
  state.setIcons = not state.setIcons
  saveSetIcons(state)
end

local function windowHeight()
  local rows = math.max(1, math.min(#state.groups, MAX_ROWS))
  return ROWS_Y + rows * ROW_H + 12 + BTN_H + 12
end

local function fitWindow()
  local height = windowHeight()
  if height ~= shownHeight then
    gfx.init("", W, height)
    shownHeight = height
  end
end

local function setColor(hex, alpha)
  local r, g, b = hex:match("^#(%x%x)(%x%x)(%x%x)$")
  gfx.set(tonumber(r, 16) / 255, tonumber(g, 16) / 255, tonumber(b, 16) / 255, alpha or 1)
end

local function fillRound(x, y, w, h, r)
  x, y, w, h, r = x * scale, y * scale, w * scale, h * scale, r * scale
  gfx.rect(x + r, y, w - 2 * r, h, 1)
  gfx.rect(x, y + r, w, h - 2 * r, 1)
  gfx.circle(x + r, y + r, r, 1, 1)
  gfx.circle(x + w - r - 1, y + r, r, 1, 1)
  gfx.circle(x + r, y + h - r - 1, r, 1, 1)
  gfx.circle(x + w - r - 1, y + h - r - 1, r, 1, 1)
end

local function frameRound(x, y, w, h, r)
  gfx.roundrect(x * scale, y * scale, w * scale, h * scale, r * scale, 1)
end

local function fitText(text, width)
  if gfx.measurestr(text) <= width then return text end
  while #text > 0 and gfx.measurestr(text .. "...") > width do text = text:sub(1, -2) end
  return text .. "..."
end

local function drawText(text, x, y, w, h, flags)
  gfx.x, gfx.y = x * scale, y * scale
  gfx.drawstr(fitText(text, w * scale), flags, (x + w) * scale, (y + h) * scale)
end

local function addHit(key, x, y, w, h, action)
  hits[#hits + 1] = { key = key, x = x, y = y, w = w, h = h, action = action }
end

local function setFont(size)
  gfx.setfont(1, "Arial", size * scale)
end

local function button(key, label, x, y, w, h, primary, action)
  setColor(primary and ACCENT or "#444444")
  fillRound(x, y, w, h, 4)
  if not primary then
    setColor("#666666")
    frameRound(x, y, w, h, 4)
  end
  setColor(primary and "#FFFFFF" or "#DDDDDD")
  drawText(label, x, y, w, h, 5)
  addHit(key, x, y, w, h, action)
end

local function iconImage(icon)
  if icon == "" then return nil end
  local path = iconPath(icon)
  if iconCache[path] == nil then
    iconCache[path] = false
    if nextSlot < 1000 and reaper.file_exists(path) then
      local slot = gfx.loadimg(nextSlot, path)
      if slot and slot >= 0 then
        iconCache[path] = slot
        nextSlot = nextSlot + 1
      end
    end
  end
  return iconCache[path] or nil
end

local function drawRow(index, y)
  local group = state.groups[index]
  local iconAlpha = state.setIcons and 1 or 0.3

  setColor(group.color)
  fillRound(PAD, y + 5, 34, 20, 3)
  setColor("#777777")
  frameRound(PAD, y + 5, 34, 20, 3)
  addHit("colour" .. index, PAD, y + 5, 34, 20, function() pickColor(group) end)

  local iconX = PAD + 44
  setColor("#555555", iconAlpha)
  fillRound(iconX, y + 3, 24, 24, 3)
  setColor("#777777", iconAlpha)
  frameRound(iconX, y + 3, 24, 24, 3)
  local image = iconImage(group.icon)
  if image then
    local iw, ih = gfx.getimgdim(image)
    gfx.a = iconAlpha
    gfx.blit(image, 1, 0, 0, 0, iw, ih, (iconX + 2) * scale, (y + 5) * scale, 20 * scale, 20 * scale)
  end
  if state.setIcons then
    addHit("icon" .. index, iconX, y + 3, 24, 24, function() pickIcon(group) end)
  end

  local nameX = iconX + 34
  setFont(14)
  setColor("#EEEEEE")
  drawText(group.name, nameX, y, 84, ROW_H, 4)

  local wordsX = nameX + 90
  local editX = W - PAD - 58 - 6 - 58
  setFont(12)
  setColor("#888888")
  drawText(table.concat(group.words, ", "), wordsX, y, editX - 10 - wordsX, ROW_H, 4)

  button("edit" .. index, "Edit", editX, y + 5, 58, 20, false, function() editGroup(group) end)
  button("remove" .. index, "Remove", W - PAD - 58, y + 5, 58, 20, false, function() removeGroup(index) end)

  setColor("#3A3A3A")
  gfx.line(PAD * scale, (y + ROW_H) * scale - 1, (W - PAD) * scale, (y + ROW_H) * scale - 1)
end

local function draw()
  scale = (gfx.ext_retina and gfx.ext_retina > 0) and gfx.ext_retina or 1
  hits = {}
  setColor("#2B2B2B")
  gfx.rect(0, 0, gfx.w, gfx.h, 1)

  setFont(14)
  local boxX, boxY = PAD, 12
  if state.setIcons then
    setColor(ACCENT)
    fillRound(boxX, boxY, 14, 14, 3)
    setColor("#FFFFFF")
    for offset = 0, 1 do
      gfx.line((boxX + 3) * scale, (boxY + 7) * scale + offset, (boxX + 6) * scale, (boxY + 10) * scale + offset, 1)
      gfx.line((boxX + 6) * scale, (boxY + 10) * scale + offset, (boxX + 11) * scale, (boxY + 4) * scale + offset, 1)
    end
  else
    setColor("#888888")
    frameRound(boxX, boxY, 14, 14, 3)
  end
  local label = "Set icons too"
  local labelWidth = gfx.measurestr(label) / scale
  setColor("#EEEEEE")
  drawText(label, boxX + 22, 10, labelWidth + 4, 18, 4)
  addHit("seticons", boxX, 10, 22 + labelWidth, 18, toggleSetIcons)

  setFont(12)
  setColor("#999999")
  drawText("Click a color or an icon to change it. Groups are checked top to bottom.", PAD, 34, W - 2 * PAD, 16, 4)

  scroll = math.max(0, math.min(scroll, #state.groups - MAX_ROWS))
  local visible = math.min(#state.groups, MAX_ROWS)
  if visible == 0 then
    setFont(13)
    setColor("#888888")
    drawText("No groups", PAD, ROWS_Y, W - 2 * PAD, ROW_H, 5)
  end
  for row = 1, visible do
    drawRow(row + scroll, ROWS_Y + (row - 1) * ROW_H)
  end
  if #state.groups > MAX_ROWS then
    local trackH = MAX_ROWS * ROW_H
    local thumbH = trackH * MAX_ROWS / #state.groups
    local thumbY = ROWS_Y + (trackH - thumbH) * scroll / (#state.groups - MAX_ROWS)
    setColor("#666666")
    fillRound(W - 6, thumbY, 4, thumbH, 2)
  end

  setFont(13)
  local buttonsY = ROWS_Y + math.max(1, visible) * ROW_H + 12
  local buttonW = (W - 2 * PAD - 3 * 8) / 4
  button("add", "Add Group", PAD, buttonsY, buttonW, BTN_H, false, addGroup)
  button("reset", "Reset to Defaults", PAD + (buttonW + 8), buttonsY, buttonW, BTN_H, false, resetToDefaults)
  button("apply", "Apply to Tracks", PAD + 2 * (buttonW + 8), buttonsY, buttonW, BTN_H, true, function() return applyToTracks(state) end)
  button("close", "Close", PAD + 3 * (buttonW + 8), buttonsY, buttonW, BTN_H, false, function() return true end)
end

local function hitAt(x, y)
  for i = #hits, 1, -1 do
    local hit = hits[i]
    if x >= hit.x and x < hit.x + hit.w and y >= hit.y and y < hit.y + hit.h then return hit end
  end
  return nil
end

local function loop()
  local char = gfx.getchar()
  if char < 0 or char == 27 then
    gfx.quit()
    return
  end

  draw()

  local x, y = gfx.mouse_x / scale, gfx.mouse_y / scale
  local down = (gfx.mouse_cap & 1) == 1
  if down and not wasDown then
    local hit = hitAt(x, y)
    pressedKey = hit and hit.key
  elseif wasDown and not down then
    local hit = hitAt(x, y)
    local key = pressedKey
    pressedKey = nil
    if hit and key and hit.key == key then
      if hit.action() then
        gfx.quit()
        return
      end
      fitWindow()
    end
  end
  wasDown = down

  if gfx.mouse_wheel ~= 0 then
    scroll = scroll + (gfx.mouse_wheel > 0 and -1 or 1)
    gfx.mouse_wheel = 0
  end

  gfx.update()
  reaper.defer(loop)
end

if reaper.set_action_options then reaper.set_action_options(3) end

shownHeight = windowHeight()
local mouseX, mouseY = reaper.GetMousePosition()
gfx.ext_retina = 1
gfx.init(TITLE, W, shownHeight, 0, mouseX - W / 2, mouseY - shownHeight / 2)
reaper.defer(loop)
