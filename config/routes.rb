Rails.application.routes.draw do
  root "image#new"
  resources :images, only: %i[new create show]
  get "up" => "rails/health#show", as: :rails_health_check
end
