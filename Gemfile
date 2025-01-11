source "https://rubygems.org"
ruby "3.4.1"

gem "importmap-rails"
gem "rails", "~> 8.0.0"
gem "propshaft"
gem "pg", "~> 1.1"
gem "puma", ">= 5.0"
gem "tzinfo-data", platforms: %i[ windows jruby ]
gem "slim-rails"
gem "slim_lint"
gem "solid_cache"
gem "solid_queue"
gem "kamal", require: false
gem "thruster", require: false

group :development, :test do
  gem "debug", platforms: %i[ mri windows ], require: "debug/prelude"
  gem "brakeman", require: false
  gem "rubocop-rails-omakase", require: false
end
