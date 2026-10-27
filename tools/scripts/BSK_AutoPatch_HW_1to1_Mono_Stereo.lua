-- Auto Patch Tracks 1:1
-- Mono and stereo hardware inputs and outputs

if reaper.GetPlayState() & 5 ~= 0 then
    reaper.ShowMessageBox("Failed to auto patch: REAPER is playing or recording.\n\nStop first, then patch.", "Auto Patch", 0)
    return
end

local trackCount = reaper.CountTracks(0)

local hwOutputs = reaper.GetNumAudioOutputs()
local hwInputs = reaper.GetNumAudioInputs()

if hwOutputs == 0 and hwInputs == 0 then
    reaper.ShowMessageBox("Failed to auto patch: no audio device is open.\n\nPreferences > Audio > Device.", "Auto Patch", 0)
    return
end

local STEREO_NOTE = "P_EXT:BSK_STEREO"

local function inputOf(track)
    return math.tointeger(math.floor(reaper.GetMediaTrackInfo_Value(track, "I_RECINPUT"))) or -1
end

local function isStereo(track)
    local input = inputOf(track)
    if input < 0 then
        local _, note = reaper.GetSetMediaTrackInfo_String(track, STEREO_NOTE, "", false)
        return note == "1"
    end
    return input & 6144 == 0 and input & 1024 ~= 0
end

local plan = {}
local stereoCount, stereoPatched = 0, 0
local patchedIn, patchedOut = 0, 0
local channel = 0
for i = 0, trackCount - 1 do
    local track = reaper.GetTrack(0, i)
    local width = isStereo(track) and 2 or 1
    if width == 2 then stereoCount = stereoCount + 1 end
    plan[i] = { track = track, first = channel, width = width }
    if channel + width <= hwInputs then patchedIn = i + 1 end
    if channel + width <= hwOutputs then patchedOut = i + 1 end
    channel = channel + width
end
for i = 0, math.min(patchedIn, patchedOut) - 1 do
    if plan[i].width == 2 then stereoPatched = stereoPatched + 1 end
end

local function tracksUpTo(n, verb)
    if n == 0 then return "no track " .. verb .. "s" end
    if n == 1 then return "only track 1 " .. verb .. "s" end
    return "only tracks 1-" .. n .. " " .. verb
end

local function blank(from, what)
    if from == trackCount then return "Track " .. from .. " gets no " .. what .. "." end
    return "Tracks " .. from .. "-" .. trackCount .. " get no " .. what .. "."
end

local function count(n, word)
    if n == 0 then return "no " .. word .. "s" end
    return n .. " " .. word .. (n == 1 and "" or "s")
end

local lines = {}
if stereoCount == 0 then
    lines[1] = "All tracks are mono."
elseif stereoPatched == 1 then
    lines[1] = "1 stereo track gets a pair of inputs and outputs."
elseif stereoPatched > 1 then
    lines[1] = stereoPatched .. " stereo tracks get a pair of inputs and outputs."
end
if patchedIn < trackCount and patchedIn == patchedOut then
    lines[#lines + 1] = "Your interface has " .. count(hwInputs, "input") .. " and " .. count(hwOutputs, "output") .. ", so " .. tracksUpTo(patchedIn, "get") .. " patched. " .. blank(patchedIn + 1, "input or output")
else
    if patchedIn < trackCount then
        lines[#lines + 1] = "Your interface has " .. count(hwInputs, "input") .. ", so " .. tracksUpTo(patchedIn, "get") .. " an input. " .. blank(patchedIn + 1, "input")
    end
    if patchedOut < trackCount then
        lines[#lines + 1] = "Your interface has " .. count(hwOutputs, "output") .. ", so " .. tracksUpTo(patchedOut, "get") .. " an output. " .. blank(patchedOut + 1, "output")
    end
end

local function oneLeft(patched, hw)
    local p = plan[patched]
    return p ~= nil and p.width == 2 and p.first == hw - 1
end
local inShort, outShort = oneLeft(patchedIn, hwInputs), oneLeft(patchedOut, hwOutputs)
local needs = " is stereo and needs 2 channels, but only 1 "
if inShort and outShort and patchedIn == patchedOut then
    lines[#lines + 1] = "Track " .. (patchedIn + 1) .. needs .. "is left."
else
    if inShort then
        lines[#lines + 1] = "Track " .. (patchedIn + 1) .. needs .. "input is left."
    end
    if outShort then
        lines[#lines + 1] = "Track " .. (patchedOut + 1) .. needs .. "output is left."
    end
end

local question = "Patch every track 1:1?\n\n" .. table.concat(lines, "\n")

if reaper.ShowMessageBox(question, "Auto Patch", 1) ~= 1 then
    return
end

reaper.Undo_BeginBlock()

for i = 0, trackCount - 1 do

    local p = plan[i]
    local track = p.track
    local stereo = p.width == 2

    -------------------------------------------------
    -- INPUT PATCHING (mono 1:1, stereo takes a pair)
    -------------------------------------------------
    if i < patchedIn then
        reaper.SetMediaTrackInfo_Value(track, "I_RECINPUT", stereo and 1024 + p.first or p.first)
        reaper.GetSetMediaTrackInfo_String(track, STEREO_NOTE, "", true)
    else
        local input = inputOf(track)
        if input >= 0 and input & 4096 == 0 then
            reaper.SetMediaTrackInfo_Value(track, "I_RECINPUT", -1)
        end
        reaper.GetSetMediaTrackInfo_String(track, STEREO_NOTE, stereo and "1" or "", true)
    end

    -------------------------------------------------
    -- REMOVE EXISTING HARDWARE OUTPUTS
    -------------------------------------------------
    local hwOutCount = reaper.GetTrackNumSends(track, 1)
    for j = hwOutCount - 1, 0, -1 do
        reaper.RemoveTrackSend(track, 1, j)
    end

    if i < patchedOut then

        -------------------------------------------------
        -- CREATE HARDWARE OUTPUT
        -------------------------------------------------
        local sendIndex = reaper.CreateTrackSend(track, nil)

        -- mono output channel, or an output pair for a stereo track
        reaper.SetTrackSendInfo_Value(track, 1, sendIndex, "I_SRCCHAN", stereo and 0 or 1024)
        reaper.SetTrackSendInfo_Value(track, 1, sendIndex, "I_DSTCHAN", stereo and p.first or 1024 + p.first)
    end
end

reaper.Undo_EndBlock("Auto Patch Tracks 1:1 Hardware IO", 1)
local dir = debug.getinfo(1, "S").source:match("^@(.*[/\\])")
local common = dir .. "BSK_Transport_Common.lua"
if reaper.file_exists(common) then dofile(common).forgetSetup() end
reaper.TrackList_AdjustWindows(false)
