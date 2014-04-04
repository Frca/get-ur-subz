<?php

use Nette\Application\Routers\RouteList,
    Nette\Application\Routers\Route;


/**
 * Router factory.
 */
class RouterFactory
{

    /**
     * @return Nette\Application\IRouter
     */
    public function createRouter()
    {
        $router = new RouteList();

        // default route
        $router[] = new Route('<presenter>/<action>[/<id>][/<value>]', 'Homepage:default');

        return $router;
    }

}
