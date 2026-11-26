package com.raimatak.speciesdb;

import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import org.junit.Test;

public class MainActivityTest {

    @Test
    public void startScreensAreRootPages() {
        assertTrue(MainActivity.isRootPage("https://localhost/"));
        assertTrue(MainActivity.isRootPage("https://localhost/index.html"));
        assertTrue(MainActivity.isRootPage("https://localhost/login.html"));
        assertTrue(MainActivity.isRootPage("https://localhost/login_tetum.html"));
        assertTrue(MainActivity.isRootPage("https://localhost/home.html"));
        assertTrue(MainActivity.isRootPage("https://localhost/tetum.html?x=1#top"));
    }

    @Test
    public void otherPagesAreNotRootPages() {
        assertFalse(MainActivity.isRootPage("https://localhost/specie.html?id=12"));
        assertFalse(MainActivity.isRootPage("https://localhost/specie_tetum.html?id=12"));
        assertFalse(MainActivity.isRootPage("https://localhost/video.html?media=a&species_id=1"));
        assertFalse(MainActivity.isRootPage("https://localhost/sub/home.html"));
        assertFalse(MainActivity.isRootPage(null));
        assertFalse(MainActivity.isRootPage("not a url"));
    }
}
