local retval, filepath = reaper.GetUserFileNameForRead("", "Import Track Names", "")
if not retval then return end

local file = io.open(filepath, "r")
if not file then
    reaper.ShowMessageBox("Could not open file.", "Import Track Names", 0)
    return
end

local lines = {}
for line in file:lines() do
    table.insert(lines, line)
end
file:close()

local function trim(s)
    return s:match("^%s*(.-)%s*$")
end

local function parseCSVLine(line)
    local fields = {}
    local i = 1
    local n = #line
    while i <= n do
        if line:sub(i, i) == '"' then
            local field = ""
            i = i + 1
            while i <= n do
                if line:sub(i, i) == '"' then
                    if line:sub(i + 1, i + 1) == '"' then
                        field = field .. '"'
                        i = i + 2
                    else
                        i = i + 1
                        break
                    end
                else
                    field = field .. line:sub(i, i)
                    i = i + 1
                end
            end
            table.insert(fields, field)
            if line:sub(i, i) == "," then i = i + 1 end
        else
            local j = line:find(",", i, true)
            if j then
                table.insert(fields, trim(line:sub(i, j - 1)))
                i = j + 1
            else
                table.insert(fields, trim(line:sub(i)))
                break
            end
        end
    end
    return fields
end

local function findNameCol(fields)
    local targets = { "name", "channel name", "input name", "ch name", "label" }
    for i, h in ipairs(fields) do
        for _, t in ipairs(targets) do
            if trim(h):lower() == t then return i end
        end
    end
    return nil
end

local names = {}

local inChannels = false
local nameCol = nil
local sectionHeaderParsed = false

for _, line in ipairs(lines) do
    local trimmed = trim(line)
    if trimmed:match("^%[Channels%]") then
        inChannels = true
        sectionHeaderParsed = false
        nameCol = nil
    elseif trimmed:match("^%[") then
        inChannels = false
    elseif inChannels and not sectionHeaderParsed then
        nameCol = findNameCol(parseCSVLine(trimmed))
        sectionHeaderParsed = true
    elseif inChannels and nameCol and #trimmed > 0 then
        local fields = parseCSVLine(trimmed)
        local n = fields[nameCol]
        if n and #trim(n) > 0 then
            table.insert(names, trim(n))
        end
    end
end

if #names == 0 then
    local headerFound = false
    nameCol = nil
    for _, line in ipairs(lines) do
        local trimmed = trim(line)
        if #trimmed == 0 then goto continue end
        if not headerFound then
            nameCol = findNameCol(parseCSVLine(trimmed))
            headerFound = true
        elseif nameCol then
            local fields = parseCSVLine(trimmed)
            local n = fields[nameCol]
            if n and #trim(n) > 0 then
                table.insert(names, trim(n))
            end
        end
        ::continue::
    end
end

if #names == 0 then
    for _, line in ipairs(lines) do
        local trimmed = trim(line)
        if #trimmed > 0 then
            table.insert(names, trimmed)
        end
    end
end

if #names == 0 then
    reaper.ShowMessageBox("No track names found in file.", "Import Track Names", 0)
    return
end

local mode = reaper.ShowMessageBox(
    "How do you want to apply these " .. #names .. " names?\n\nYes = Rename existing tracks\nNo = Create new tracks",
    "Import Track Names",
    4
)

reaper.Undo_BeginBlock()

if mode == 6 then
    local trackCount = reaper.CountTracks(0)
    local renamed = 0
    for i, name in ipairs(names) do
        if i - 1 >= trackCount then break end
        local track = reaper.GetTrack(0, i - 1)
        reaper.GetSetMediaTrackInfo_String(track, "P_NAME", name, true)
        renamed = renamed + 1
    end
    reaper.Undo_EndBlock("Import Track Names from File", -1)
    reaper.TrackList_AdjustWindows(false)
    reaper.ShowMessageBox(renamed .. " tracks renamed.", "Import Track Names", 0)
else
    local startIndex = reaper.CountTracks(0)
    for i, name in ipairs(names) do
        reaper.InsertTrackAtIndex(startIndex + i - 1, false)
        local track = reaper.GetTrack(0, startIndex + i - 1)
        reaper.GetSetMediaTrackInfo_String(track, "P_NAME", name, true)
    end
    reaper.Undo_EndBlock("Import Track Names from File", -1)
    reaper.TrackList_AdjustWindows(false)
    reaper.ShowMessageBox(#names .. " tracks created.", "Import Track Names", 0)
end
