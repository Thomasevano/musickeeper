import '@adonisjs/core/types/http'

type ParamValue = string | number | bigint | boolean

export type ScannedRoutes = {
  ALL: {
    'home.index': { paramsTuple?: []; params?: {} }
    'link.oembed': { paramsTuple?: []; params?: {} }
    'link.apple_music': { paramsTuple?: []; params?: {} }
    'link.metadata': { paramsTuple?: []; params?: {} }
    'listen_later_list.index': { paramsTuple?: []; params?: {} }
  }
  GET: {
    'home.index': { paramsTuple?: []; params?: {} }
    'listen_later_list.index': { paramsTuple?: []; params?: {} }
  }
  HEAD: {
    'home.index': { paramsTuple?: []; params?: {} }
    'listen_later_list.index': { paramsTuple?: []; params?: {} }
  }
  POST: {
    'link.oembed': { paramsTuple?: []; params?: {} }
    'link.apple_music': { paramsTuple?: []; params?: {} }
    'link.metadata': { paramsTuple?: []; params?: {} }
  }
}
declare module '@adonisjs/core/types/http' {
  export interface RoutesList extends ScannedRoutes {}
}