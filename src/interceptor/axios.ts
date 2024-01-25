import { getRefreshToken } from "../services/spotify_auth_service"
import axios from "axios"

let refresh = false

axios.interceptors.response.use(resp => resp, async error => {
  if (error.response.status === 401 && !refresh) {
    refresh = true
    const response = await getRefreshToken()

    if (response.status === 200){
      axios.defaults.headers.common["Authorization"] = `Bearer ${response.access_token}`

      console.log(error.config)
      return axios(error.config)
    }
  }
  refresh = false
  return error
});