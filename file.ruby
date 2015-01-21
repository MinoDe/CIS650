#!/usr/bin/ruby

puts ARGC

#v1 = ARGV[0]
#v2 = ARGV[1]

begin
    file = File.new("readfile.rb", "r")
    while (line = file.gets)
        puts "#{counter}: #{line}"
        counter = counter + 1
    end
    file.close
rescue => err
    puts "Exception: #{err}"
    err
end