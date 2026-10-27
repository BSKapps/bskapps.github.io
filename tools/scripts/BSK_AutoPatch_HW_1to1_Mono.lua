-- Auto Patch Tracks 1:1
-- Mono hardware inputs and outputs

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

local function tracksUpTo(n, verb)
    if n == 0 then return "no track " .. verb .. "s" end
    if n == 1 then return "only track 1 " .. verb .. "s" end
    return "only tracks 1-" .. n .. " " .. verb
end

local function kept(from)
    if from == trackCount then return "Track " .. from .. " keeps what it has." end
    return "Tracks " .. from .. "-" .. trackCount .. " keep what they have."
end

local function count(n, word)
    if n == 0 then return "no " .. word .. "s" end
    return n .. " " .. word .. (n == 1 and "" or "s")
end

local lines = {}
if hwInputs < trackCount and hwInputs == hwOutputs then
    lines[1] = "Your interface has " .. count(hwInputs, "input") .. " and " .. count(hwOutputs, "output") .. ", so " .. tracksUpTo(hwInputs, "get") .. " patched. " .. kept(hwInputs + 1)
else
    if hwInputs < trackCount then
        lines[#lines + 1] = "Your interface has " .. count(hwInputs, "input") .. ", so " .. tracksUpTo(hwInputs, "get") .. " an input. " .. kept(hwInputs + 1)
    end
    if hwOutputs < trackCount then
        lines[#lines + 1] = "Your interface has " .. count(hwOutputs, "output") .. ", so " .. tracksUpTo(hwOutputs, "get") .. " an output. " .. kept(hwOutputs + 1)
    end
end

local question = "Patch every track 1:1 mono?"
if #lines > 0 then question = question .. "\n\n" .. table.concat(lines, "\n") end

if reaper.ShowMessageBox(question, "Auto Patch", 1) ~= 1 then
    return
end

reaper.Undo_BeginBlock()

for i = 0, trackCount - 1 do

    local track = reaper.GetTrack(0, i)

    -------------------------------------------------
    -- INPUT PATCHING (Mono 1:1)
    -------------------------------------------------
    if i < hwInputs then
        reaper.SetMediaTrackInfo_Value(track, "I_RECINPUT", i)
    end

    if i < hwOutputs then

        -------------------------------------------------
        -- REMOVE EXISTING HARDWARE OUTPUTS
        -------------------------------------------------
        local hwOutCount = reaper.GetTrackNumSends(track, 1)
        for j = hwOutCount - 1, 0, -1 do
            reaper.RemoveTrackSend(track, 1, j)
        end

        -------------------------------------------------
        -- CREATE HARDWARE OUTPUT
        -------------------------------------------------
        local sendIndex = reaper.CreateTrackSend(track, nil)

        reaper.SetTrackSendInfo_Value(track, 1, sendIndex, "I_SRCCHAN", 1024)

        -- mono output channel
        reaper.SetTrackSendInfo_Value(track, 1, sendIndex, "I_DSTCHAN", 1024 + i)
    end
end

reaper.Undo_EndBlock("Auto Patch Tracks 1:1 Hardware IO", 1)
local dir = debug.getinfo(1, "S").source:match("^@(.*[/\\])")
local common = dir .. "BSK_Transport_Common.lua"
if reaper.file_exists(common) then dofile(common).forgetSetup() end
reaper.TrackList_AdjustWindows(false)
