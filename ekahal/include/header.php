

<?php

?>  


<div class="wrapper">	

<header class="header">
 <div class="container">
    <a href="index.php" class="logo">Ekahal - Dash</a>
    <input class="menu-btn" type="checkbox" id="menu-btn" />
    <label class="menu-icon" for="menu-btn"><span class="navicon"></span></label>
    <ul class="menu">
        <li><a href="#work">Home</a></li>
        <li><a href="#">About</a></li>
        <li><a href="#">How it works</a></li>
        <li><a href="#">Contact</a></li>
        <li class="login-btn"><a id="test" href="javascript:;">Login</a></li>
    </ul>
  </div>

  <div style="display: none;" id="hidden-content">
	<h2>Login Here</h2>
	<form action="">
    <div class="form-group">
      <label for="">Email Id</label>
      <input type="email">
    </div>
    <div class="form-group">
      <label for="">Password</label>
      <input type="password">
      <span>Forgot Password ?</span>
    </div>
    <a href="dash.php">Login</a>
  </form>
</div>
</header>
