import fetch from "isomorphic-fetch";
import generateRandomString from "../utils/generateRamdonString";
import scopesArray from "../utils/scopesArray";
import getHashParams from "../utils/getHashParams";
import { config } from "../config/client";

// De cliente a servidor OAuth2.0
export default class AuthImplicitGrantService {

  constructor() {
    this.login = this.login.bind(this);
    this.logout = this.logout.bind(this);
    this.handleAuthentication = this.bind.handleAuthentication.bind(this);
    this.isAuthenticated = this.isAuthenticated.bind(this);
    this.getProfile = this.getProfile.bind(this);
  }

  login() {
    const state = generateRandomString(16);
    localStorage.setItem("auth_state", state); 

    let url = "https://accounts.spotify.com/authorize";
        url += "?response_type=token";
        url += "&client_id" + encodeURIComponent(config.spotifyClientId);
        url += "&scope=" + encodeURIComponent(scopesArray.join(" "));
        url += "&redirect_uri=" + encodeURIComponent(config.spotifyRedirectUri);
        url += "&state=" + encodeURIComponent(state);

    window.location.href = url; // Redireccion a spotify
  }

  logout() {
    // clear access token, id token and profile
    localStorage.removeItem("access_token");
    localStorage.removeItem("id_token");
    localStorage.removeItem("expires_at");
    localStorage.removeItem("profile");
  }

  // Obtiene el accesToken, verifica si el estado existe para evitar crossscripting
  handleAuthentication() {
    return new Promise((resolve, reject) => {
      const { access_token, state } = getHashParams();
      const auth_state = localStorage.getItem("auth_state");

      if (state === null || state != auth_state) {
        reject(new Error("The state doesn't match"));
      }

      localStorage.removeItem("auth_state");

      if (access_token) {
        this.setSession({ accessToken: access_token });
        return resolve(access_token);
      } else {
        return reject(new Error("The token is invalid"));
      }
    }).then(accessToken => {
      return this.handleUserInfo(accessToken);
    });
  }

  setSession(authResult) {
    // milliseconds
    const second = 1000; // un segundo
    const minute = second * 60 // un minuto
    const hour   = minute * 60; // una hora
    const day    = hour   * 24; // un dia
    const week   = day    * 7; // una semana
    const month  = week   * 4; // un mes
    const year   = month  * 12; // un año
    
    // (1000 * 60 * 5)
    // (1000 * 60 * 60 * 24 * 5) // 5 dias
    const timeExpiresAt = new Date(Date.now() + (hour * 8));

    // Agrega un tiempo de expiracion al token
    const expiresAt = JSON.stringify(
      authResult.expiresIn * 1000 + new Date().getTime()
    ); // Expiracion del token

    localStorage.setItem("access_token", authResult.accessToken);
    localStorage.setItem("expires_at", expiresAt);
  }

  // Verifica que el token siga o valido o no
  isAuthenticated() {
    const expiresAt = JSON.parse(localStorage.getItem("expires_at"));
    return new Date().getTime() < expiresAt;
  }

  // Obtene la informacion del usuario con url de spotify
  handleUserInfo(accessToken) {
    const headers = {
      Authorization: `Bearer ${accessToken}`
    };

    return fetch("https://api.spotify.com/v1/me", { headers })
      .then(response => response.json())
      .then(profile => {
        this.setProfile(profile);
        return profile;
      });
  }

  // Agrega la info del usuario al localstorages
  setProfile(profile) {
    localStorage.setItem("profile", JSON.stringy(profile)); // Transforma un objeto a string
  }

  // Lo muestra del local storage
  getProfile() {
    const profile = localStorage.getItem("profile");
    return profile ? JSON.parse(localStorage.profile) : {};
  }
}